import { Injectable } from '@nestjs/common';
import type { BBox } from '../../../common/geo/bbox';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { StopRepository } from '../application/network.ports';
import { compareRouteNumbers } from '../domain/route';
import type { Stop, StopDetails } from '../domain/stop';

@Injectable()
export class PrismaStopRepository implements StopRepository {
  constructor(private readonly prisma: PrismaService) {}

  findInBox(box: BBox): Promise<Stop[]> {
    return this.prisma.stop.findMany({
      where: {
        lat: { gte: box.minLat, lte: box.maxLat },
        lon: { gte: box.minLon, lte: box.maxLon },
      },
    });
  }

  async findDetails(id: number): Promise<StopDetails | null> {
    const row = await this.prisma.stop.findUnique({
      where: { id },
      include: {
        routeStops: {
          include: {
            direction: {
              select: {
                direction: true,
                towards: true,
                route: { select: { id: true, number: true } },
              },
            },
          },
        },
      },
    });
    if (!row) return null;
    const { routeStops, ...stop } = row;
    return {
      ...stop,
      routes: routeStops
        .map((rs) => ({
          routeId: rs.direction.route.id,
          routeNumber: rs.direction.route.number,
          direction: rs.direction.direction,
          towards: rs.direction.towards,
          order: rs.order,
        }))
        .sort(
          (a, b) => compareRouteNumbers(a.routeNumber, b.routeNumber) || a.direction - b.direction,
        ),
    };
  }
}
