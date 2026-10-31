import type { DirectionService } from './service-plan';

/**
 * Vehicle positions as a pure function of time — nothing is stored or ticked.
 *
 * Model: on each direction a bus departs the first stop at `phase + n·headway` (epoch seconds, any
 * integer n) and drives the line at constant speed. Departure n is operated by vehicle
 * `n mod fleetSize`; fleetSize covers one trip, so active vehicles never share an index.
 */

export interface VehiclePosition {
  vehicleId: string;
  routeId: number;
  direction: number;
  vehicleIndex: number;
  /** Distance from the first stop along the line (m). */
  distanceM: number;
  isReserve: boolean;
}

/** A reserve bus dispatched by an operator: departs at `startedAtS` and loops the direction. */
export interface ReserveVehicle {
  id: string;
  routeId: number;
  direction: number;
  startedAtS: number;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

export function tripDurationS(service: DirectionService): number {
  return service.lengthM / service.speedMps;
}

export function fleetSize(service: DirectionService): number {
  return Math.max(1, Math.ceil(tripDurationS(service) / service.headwayS));
}

export function regularVehicleId(routeId: number, direction: number, index: number): string {
  return `${routeId}-${direction}-${index}`;
}

export function reserveVehicleId(reserveId: string): string {
  return `reserve-${reserveId}`;
}

/** Departure indices currently on the road: departure ≤ now < departure + trip. */
function activeDepartures(service: DirectionService, nowS: number): number[] {
  const trip = tripDurationS(service);
  const first = Math.floor((nowS - service.phaseS - trip) / service.headwayS) + 1;
  const last = Math.floor((nowS - service.phaseS) / service.headwayS);
  const result: number[] = [];
  for (let n = Math.max(first, last - fleetSize(service) + 1); n <= last; n++) {
    const departure = service.phaseS + n * service.headwayS;
    if (nowS - departure < trip) result.push(n);
  }
  return result;
}

/** All regular vehicles currently driving this direction, ordered from the first stop onwards. */
export function activeVehicles(service: DirectionService, nowS: number): VehiclePosition[] {
  const fleet = fleetSize(service);
  return activeDepartures(service, nowS)
    .reverse()
    .map((n) => {
      const index = mod(n, fleet);
      return {
        vehicleId: regularVehicleId(service.routeId, service.direction, index),
        routeId: service.routeId,
        direction: service.direction,
        vehicleIndex: index,
        distanceM: (nowS - (service.phaseS + n * service.headwayS)) * service.speedMps,
        isReserve: false,
      };
    });
}

/** position(route, direction, vehicleIndex, now): distance along the line, or null if not on the road. */
export function positionOf(
  service: DirectionService,
  vehicleIndex: number,
  nowS: number,
): number | null {
  const vehicle = activeVehicles(service, nowS).find((v) => v.vehicleIndex === vehicleIndex);
  return vehicle ? vehicle.distanceM : null;
}

/** Reserve bus position: loops the direction from its dispatch time; null before dispatch. */
export function reservePosition(
  service: DirectionService,
  reserve: ReserveVehicle,
  nowS: number,
): VehiclePosition | null {
  const elapsed = nowS - reserve.startedAtS;
  if (elapsed < 0) return null;
  return {
    vehicleId: reserveVehicleId(reserve.id),
    routeId: reserve.routeId,
    direction: reserve.direction,
    vehicleIndex: -1,
    distanceM: mod(elapsed * service.speedMps, service.lengthM),
    isReserve: true,
  };
}
