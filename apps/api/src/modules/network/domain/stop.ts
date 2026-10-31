import { haversineM } from '../../../common/geo/haversine';
import type { LonLat } from '../../../common/geo/geo.types';

export interface Stop {
  id: number;
  code: string;
  name: string;
  lat: number;
  lon: number;
  isHub: boolean;
}

export interface StopRouteView {
  routeId: number;
  routeNumber: string;
  direction: number;
  towards: string;
  order: number;
}

export interface StopDetails extends Stop {
  routes: StopRouteView[];
}

export interface NearbyStop extends Stop {
  distanceM: number;
}

export const MAX_NEARBY_RADIUS_M = 3000;

/** Exact circle filter (the DB only pre-filters by bounding box), nearest first. */
export function selectNearbyStops(
  candidates: readonly Stop[],
  origin: LonLat,
  radiusM: number,
  limit: number,
): NearbyStop[] {
  return candidates
    .map((s) => ({ ...s, distanceM: Math.round(haversineM(origin, [s.lon, s.lat])) }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM || a.id - b.id)
    .slice(0, limit);
}
