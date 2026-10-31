import { NotFoundError } from '../../../common/errors/domain-errors';
import { rankRoutes, type RouteDetails, type RouteSummary } from '../domain/route';
import type { RouteRepository } from './network.ports';

export class SearchRoutes {
  constructor(private readonly routes: RouteRepository) {}

  async execute(query = '', limit = 50): Promise<RouteSummary[]> {
    return rankRoutes(await this.routes.listSummaries(), query).slice(0, limit);
  }
}

export class GetRouteDetails {
  constructor(private readonly routes: RouteRepository) {}

  async execute(id: number): Promise<RouteDetails> {
    const route = await this.routes.findDetails(id);
    if (!route) throw new NotFoundError('Route', id);
    return route;
  }
}
