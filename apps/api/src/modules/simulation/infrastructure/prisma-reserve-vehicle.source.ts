import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ReserveVehicleSource } from '../application/simulation.ports';
import type { ReserveVehicle } from '../domain/schedule-simulator';

/** Short cache: every SSE client asks every 2 s, but reserves change only on operator action. */
const CACHE_TTL_MS = 3000;

@Injectable()
export class PrismaReserveVehicleSource implements ReserveVehicleSource {
  private cache?: { at: number; items: Promise<ReserveVehicle[]> };

  constructor(private readonly prisma: PrismaService) {}

  activeReserves(): Promise<ReserveVehicle[]> {
    const nowMs = Date.now();
    if (!this.cache || nowMs - this.cache.at > CACHE_TTL_MS) {
      const items = this.load();
      items.catch(() => (this.cache = undefined));
      this.cache = { at: nowMs, items };
    }
    return this.cache.items;
  }

  /** Drop the cache so a newly dispatched reserve shows up on the next tick. */
  invalidate(): void {
    this.cache = undefined;
  }

  private async load(): Promise<ReserveVehicle[]> {
    const rows = await this.prisma.reserveDispatch.findMany({ where: { active: true } });
    return rows.map((r) => ({
      id: r.id,
      routeId: r.routeId,
      direction: r.direction,
      startedAtS: r.createdAt.getTime() / 1000,
    }));
  }
}
