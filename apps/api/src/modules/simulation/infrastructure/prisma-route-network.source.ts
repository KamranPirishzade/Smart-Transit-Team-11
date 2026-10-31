import { Injectable } from '@nestjs/common';
import type { LonLat } from '../../../common/geo/geo.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { NetworkDirection, RouteNetworkSource } from '../application/simulation.ports';

@Injectable()
export class PrismaRouteNetworkSource implements RouteNetworkSource {
  constructor(private readonly prisma: PrismaService) {}

  async loadDirections(): Promise<NetworkDirection[]> {
    const rows = await this.prisma.routeDirection.findMany({
      include: {
        route: { select: { number: true, durationMin: true, avgDailyPassengers: true } },
        stops: { orderBy: { order: 'asc' }, select: { stopId: true, distanceFromStartM: true } },
      },
    });
    return rows.map((d) => ({
      routeId: d.routeId,
      routeNumber: d.route.number,
      direction: d.direction,
      towards: d.towards,
      lengthM: d.lengthM,
      durationMin: d.route.durationMin,
      avgDailyPassengers: d.route.avgDailyPassengers,
      geometry: d.geometry as unknown as LonLat[],
      stops: d.stops,
    }));
  }
}
