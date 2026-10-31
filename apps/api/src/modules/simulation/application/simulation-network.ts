import { cumulativeDistances } from '../../../common/geo/polyline';
import type { DirectionProfile } from '../domain/service-plan';
import type { NetworkDirection, RouteNetworkSource } from './simulation.ports';

export interface IndexedDirection extends NetworkDirection {
  key: string;
  cumulative: number[];
  profile: DirectionProfile;
}

export interface NetworkIndex {
  directions: IndexedDirection[];
  byRoute: ReadonlyMap<number, IndexedDirection[]>;
  byKey: ReadonlyMap<string, IndexedDirection>;
  /** stopId → every direction that serves it, with the stop's distance on that direction. */
  byStop: ReadonlyMap<number, { direction: IndexedDirection; distanceM: number }[]>;
}

export const directionKey = (routeId: number, direction: number): string =>
  `${routeId}:${direction}`;

/** Loads the static network once (lazily, shared promise) and indexes it for fast lookups. */
export class SimulationNetwork {
  private index?: Promise<NetworkIndex>;

  constructor(private readonly source: RouteNetworkSource) {}

  get(): Promise<NetworkIndex> {
    this.index ??= this.source.loadDirections().then(buildIndex);
    this.index.catch(() => (this.index = undefined)); // retry on the next call after a failure
    return this.index;
  }
}

export function buildIndex(directions: NetworkDirection[]): NetworkIndex {
  const indexed = directions
    .filter((d) => d.geometry.length >= 2 && d.lengthM > 0)
    .map<IndexedDirection>((d) => ({
      ...d,
      key: directionKey(d.routeId, d.direction),
      cumulative: cumulativeDistances(d.geometry),
      profile: {
        routeId: d.routeId,
        direction: d.direction,
        lengthM: d.lengthM,
        durationMin: d.durationMin,
        avgDailyPassengers: d.avgDailyPassengers,
      },
    }));
  const byRoute = new Map<number, IndexedDirection[]>();
  const byStop = new Map<number, { direction: IndexedDirection; distanceM: number }[]>();
  for (const d of indexed) {
    byRoute.set(d.routeId, [...(byRoute.get(d.routeId) ?? []), d]);
    for (const s of d.stops) {
      const list = byStop.get(s.stopId) ?? [];
      list.push({ direction: d, distanceM: s.distanceFromStartM });
      byStop.set(s.stopId, list);
    }
  }
  return {
    directions: indexed,
    byRoute,
    byKey: new Map(indexed.map((d) => [d.key, d])),
    byStop,
  };
}
