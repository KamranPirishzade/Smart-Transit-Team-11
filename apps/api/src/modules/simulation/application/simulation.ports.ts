import type { CrowdLevel } from '../../../common/domain/crowd-level';
import type { LonLat } from '../../../common/geo/geo.types';
import type { ReserveVehicle } from '../domain/schedule-simulator';

export const ROUTE_NETWORK_SOURCE = Symbol('ROUTE_NETWORK_SOURCE');
export const RESERVE_VEHICLE_SOURCE = Symbol('RESERVE_VEHICLE_SOURCE');
export const ROUTE_CROWD_READER = Symbol('ROUTE_CROWD_READER');
export const SIMULATION_CONFIG = Symbol('SIMULATION_CONFIG');

export interface NetworkDirection {
  routeId: number;
  routeNumber: string;
  direction: number;
  towards: string;
  lengthM: number;
  durationMin: number;
  avgDailyPassengers: number | null;
  geometry: LonLat[];
  /** Ordered by distance. */
  stops: { stopId: number; distanceFromStartM: number }[];
}

/** Static network the simulation runs on (loaded once). */
export interface RouteNetworkSource {
  loadDirections(): Promise<NetworkDirection[]>;
}

/** Operator-dispatched reserve buses that are currently active. */
export interface ReserveVehicleSource {
  activeReserves(): Promise<ReserveVehicle[]>;
}

/** Current crowding per route (baseline + passenger reports); missing route → unknown. */
export interface RouteCrowdReader {
  currentLevels(routeIds: readonly number[], now: Date): Promise<ReadonlyMap<number, CrowdLevel>>;
}
