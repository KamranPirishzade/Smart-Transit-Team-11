import { Injectable } from '@nestjs/common';
import { GetRouteDetails, SearchRoutes } from '../../network/public-api';
import type { LocatedRoute, RouteLocator } from '../application/simulate-surge';

/** Baku city centre: report position when a route has no stop coordinates. */
const FALLBACK = { lat: 40.3777, lon: 49.8531 };

@Injectable()
export class NetworkRouteLocator implements RouteLocator {
  constructor(
    private readonly search: SearchRoutes,
    private readonly details: GetRouteDetails,
  ) {}

  async findByNumber(routeNumber: string): Promise<LocatedRoute | null> {
    const wanted = routeNumber.toLowerCase();
    const match = (await this.search.execute(routeNumber, 250)).find(
      (r) => r.number.toLowerCase() === wanted && r.hasStops,
    );
    if (!match) return null;
    const route = await this.details.execute(match.id);
    const stop = route.directions[0]?.stops[0] ?? FALLBACK;
    return { id: route.id, number: route.number, lat: stop.lat, lon: stop.lon };
  }
}
