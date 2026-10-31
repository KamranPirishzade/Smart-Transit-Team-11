import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { LonLat } from '../../../common/geo/geo.types';
import type { RouteRepository } from '../application/network.ports';
import type { RouteDetails, RouteSummary } from '../domain/route';

@Injectable()
export class PrismaRouteRepository implements RouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listSummaries(): Promise<RouteSummary[]> {
    const rows = await this.prisma.route.findMany({
      select: {
        id: true,
        number: true,
        carrier: true,
        tariffAzn: true,
        firstPoint: true,
        lastPoint: true,
        _count: { select: { directions: true } },
      },
    });
    return rows.map(({ _count, tariffAzn, ...r }) => ({
      ...r,
      tariffAzn: tariffAzn === null ? null : Number(tariffAzn),
      hasStops: _count.directions > 0,
    }));
  }

  async findDetails(id: number): Promise<RouteDetails | null> {
    const row = await this.prisma.route.findUnique({
      where: { id },
      include: {
        directions: {
          orderBy: { direction: 'asc' },
          include: { stops: { orderBy: { order: 'asc' }, include: { stop: true } } },
        },
      },
    });
    if (!row) return null;
    const { directions, tariffAzn, ...route } = row;
    return {
      ...route,
      tariffAzn: tariffAzn === null ? null : Number(tariffAzn),
      hasStops: directions.length > 0,
      directions: directions.map((d) => ({
        direction: d.direction,
        towards: d.towards,
        lengthM: d.lengthM,
        geometry: d.geometry as unknown as LonLat[],
        geometryFromStops: d.geometryFromStops,
        stops: d.stops.map((rs) => ({
          order: rs.order,
          stopId: rs.stopId,
          name: rs.stop.name,
          lat: rs.stop.lat,
          lon: rs.stop.lon,
          distanceFromStartM: rs.distanceFromStartM,
        })),
      })),
    };
  }
}
