import {
  fleetSize,
  type ReserveVehicle,
  regularVehicleId,
  reserveVehicleId,
  tripDurationS,
} from './schedule-simulator';
import type { DirectionService } from './service-plan';

export interface Arrival {
  routeId: number;
  direction: number;
  vehicleId: string;
  /** Seconds until the bus reaches the stop (≥ 0). */
  etaS: number;
  isReserve: boolean;
}

/**
 * Next `count` regular arrivals at a stop `stopDistanceM` metres from the first stop. A bus that has
 * already passed the stop is skipped — the next departure is taken instead.
 */
export function regularArrivals(
  service: DirectionService,
  stopDistanceM: number,
  nowS: number,
  count: number,
): Arrival[] {
  const travelS = stopDistanceM / service.speedMps;
  const fleet = fleetSize(service);
  const firstN = Math.ceil((nowS - service.phaseS - travelS) / service.headwayS);
  return Array.from({ length: count }, (_, i) => {
    const n = firstN + i;
    const arrivalS = service.phaseS + n * service.headwayS + travelS;
    return {
      routeId: service.routeId,
      direction: service.direction,
      vehicleId: regularVehicleId(
        service.routeId,
        service.direction,
        ((n % fleet) + fleet) % fleet,
      ),
      etaS: Math.max(0, arrivalS - nowS),
      isReserve: false,
    };
  });
}

/** Next arrival of a looping reserve bus (one per loop). */
export function reserveArrivals(
  service: DirectionService,
  reserve: ReserveVehicle,
  stopDistanceM: number,
  nowS: number,
  count: number,
): Arrival[] {
  const loopS = tripDurationS(service);
  const travelS = stopDistanceM / service.speedMps;
  const firstLoop = Math.max(0, Math.ceil((nowS - reserve.startedAtS - travelS) / loopS));
  return Array.from({ length: count }, (_, i) => ({
    routeId: reserve.routeId,
    direction: reserve.direction,
    vehicleId: reserveVehicleId(reserve.id),
    etaS: Math.max(0, reserve.startedAtS + (firstLoop + i) * loopS + travelS - nowS),
    isReserve: true,
  }));
}

/** Soonest first; ties broken by route id then direction for a stable order. */
export function mergeArrivals(lists: readonly Arrival[][], limit: number): Arrival[] {
  return lists
    .flat()
    .sort((a, b) => a.etaS - b.etaS || a.routeId - b.routeId || a.direction - b.direction)
    .slice(0, limit);
}
