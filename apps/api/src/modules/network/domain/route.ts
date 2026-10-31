import type { LonLat } from '../../../common/geo/geo.types';

export interface RouteSummary {
  id: number;
  number: string;
  carrier: string | null;
  tariffAzn: number | null;
  firstPoint: string | null;
  lastPoint: string | null;
  /** false for routes the source publishes without stops — they have no ETA and must not be picked. */
  hasStops: boolean;
}

export interface RouteStopView {
  order: number;
  stopId: number;
  name: string;
  lat: number;
  lon: number;
  distanceFromStartM: number;
}

export interface RouteDirectionView {
  direction: number;
  towards: string;
  lengthM: number;
  geometry: LonLat[];
  geometryFromStops: boolean;
  stops: RouteStopView[];
}

export interface RouteDetails extends RouteSummary {
  lengthKm: number;
  durationMin: number;
  avgDailyPassengers: number | null;
  directions: RouteDirectionView[];
}

const collator = new Intl.Collator('az', { numeric: true, sensitivity: 'base' });

/** Natural order of route numbers: 1, 5, 7A, 49, 125, E1. */
export function compareRouteNumbers(a: string, b: string): number {
  const aDigit = /^\d/.test(a);
  const bDigit = /^\d/.test(b);
  if (aDigit !== bDigit) return aDigit ? -1 : 1;
  return collator.compare(a, b);
}

/** Matches by route number prefix ("4" → 4, 49, 45A) or by terminus name substring. */
export function matchesRouteQuery(route: RouteSummary, query: string): boolean {
  const q = query.trim().toLocaleLowerCase('az');
  if (!q) return true;
  if (route.number.toLocaleLowerCase('az').startsWith(q)) return true;
  return [route.firstPoint, route.lastPoint].some((p) => p?.toLocaleLowerCase('az').includes(q));
}

/** Exact number matches first, then routes with stops, then natural number order. */
export function rankRoutes(routes: readonly RouteSummary[], query: string): RouteSummary[] {
  const q = query.trim().toLocaleLowerCase('az');
  const exact = (r: RouteSummary): number => (r.number.toLocaleLowerCase('az') === q ? 0 : 1);
  return routes
    .filter((r) => matchesRouteQuery(r, q))
    .sort(
      (a, b) =>
        exact(a) - exact(b) ||
        Number(b.hasStops) - Number(a.hasStops) ||
        compareRouteNumbers(a.number, b.number),
    );
}
