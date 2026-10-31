import type { Prisma, PrismaClient } from '@prisma/client';
import type { SeedPlan } from './build-seed-plan';

/** Neon is a remote DB: run independent writes a few at a time instead of strictly one by one. */
const CONCURRENCY = 8;

async function forEachConcurrent<T>(
  items: readonly T[],
  worker: (item: T) => Promise<unknown>,
): Promise<void> {
  let next = 0;
  const run = async (): Promise<void> => {
    while (next < items.length) await worker(items[next++]!);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
}

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );

/**
 * Idempotent write of the reference network:
 * - stops and routes are upserted (re-running refreshes names, tariffs, demand);
 * - each route's directions + route stops are replaced in one transaction (nothing references
 *   them by FK except route_stops, which cascade).
 */
export async function writeSeedPlan(
  prisma: PrismaClient,
  plan: SeedPlan,
  log: (msg: string) => void,
): Promise<void> {
  await forEachConcurrent(chunk(plan.stops, 200), (batch) =>
    prisma.$transaction(
      // separate objects: Prisma must not see the same reference as both create and update
      batch.map((s) =>
        prisma.stop.upsert({ where: { id: s.id }, create: { ...s }, update: { ...s } }),
      ),
    ),
  );
  log(`stops: ${plan.stops.length}`);

  await forEachConcurrent(plan.routes, (r) =>
    prisma.route.upsert({ where: { id: r.id }, create: { ...r }, update: { ...r } }),
  );
  log(`routes: ${plan.routes.length}`);

  const byRoute = new Map<number, SeedPlan['directions']>();
  for (const d of plan.directions) byRoute.set(d.routeId, [...(byRoute.get(d.routeId) ?? []), d]);

  await forEachConcurrent(plan.routes, (route) =>
    prisma.$transaction(
      async (tx) => {
        await tx.routeDirection.deleteMany({ where: { routeId: route.id } });
        for (const d of byRoute.get(route.id) ?? []) {
          const created = await tx.routeDirection.create({
            data: {
              routeId: d.routeId,
              direction: d.direction,
              towards: d.towards,
              geometry: d.geometry as unknown as Prisma.InputJsonValue,
              geometryFromStops: d.geometryFromStops,
              lengthM: d.lengthM,
            },
          });
          await tx.routeStop.createMany({
            data: d.stops.map((s) => ({ ...s, directionId: created.id })),
          });
        }
      },
      { timeout: 60_000, maxWait: 30_000 },
    ),
  );
  log(
    `directions: ${plan.directions.length}, route stops: ${plan.directions.reduce((n, d) => n + d.stops.length, 0)}`,
  );
}
