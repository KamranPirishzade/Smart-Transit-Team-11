import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { RouteDemandSource } from '../application/route-demand';

@Injectable()
export class PrismaRouteDemandSource implements RouteDemandSource {
  constructor(private readonly prisma: PrismaService) {}

  async loadAll(): Promise<ReadonlyMap<number, number | null>> {
    const rows = await this.prisma.route.findMany({
      select: { id: true, avgDailyPassengers: true },
    });
    return new Map(rows.map((r) => [r.id, r.avgDailyPassengers]));
  }
}
