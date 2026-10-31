import type { BBox } from '../../../common/geo/bbox';
import type { RouteDetails, RouteSummary } from '../domain/route';
import type { Stop, StopDetails } from '../domain/stop';

export const ROUTE_REPOSITORY = Symbol('ROUTE_REPOSITORY');
export const STOP_REPOSITORY = Symbol('STOP_REPOSITORY');

export interface RouteRepository {
  /** All routes (≈200 rows) — filtering and ranking happen in the domain. */
  listSummaries(): Promise<RouteSummary[]>;
  findDetails(id: number): Promise<RouteDetails | null>;
}

export interface StopRepository {
  findInBox(box: BBox): Promise<Stop[]>;
  findDetails(id: number): Promise<StopDetails | null>;
}
