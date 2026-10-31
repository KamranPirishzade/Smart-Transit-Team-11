import { PrismaClient } from '@prisma/client';
import { loadRootEnv, selectDatabaseUrl } from '../src/common/config/load-env';

/** Prints row counts of the reference network (verification after migrate/seed). */
async function main(): Promise<void> {
  loadRootEnv(__dirname);
  selectDatabaseUrl();
  const prisma = new PrismaClient();
  try {
    const [routes, directions, stops, routeStops, routesWithoutStops] = await Promise.all([
      prisma.route.count(),
      prisma.routeDirection.count(),
      prisma.stop.count(),
      prisma.routeStop.count(),
      prisma.route.count({ where: { directions: { none: {} } } }),
    ]);
    console.log(JSON.stringify({ routes, directions, stops, routeStops, routesWithoutStops }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[db:stats] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
