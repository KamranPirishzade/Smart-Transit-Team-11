import {
  activeVehicles,
  fleetSize,
  positionOf,
  reservePosition,
  tripDurationS,
} from './schedule-simulator';
import type { DirectionService } from './service-plan';

// 6 km at 10 m/s → 600 s trip; a bus every 120 s → 5 vehicles
const service: DirectionService = {
  routeId: 37,
  direction: 1,
  lengthM: 6000,
  headwayS: 120,
  speedMps: 10,
  phaseS: 30,
};
const T0 = 1_800_000_000; // a departure instant: (T0 - phase) is a multiple of the headway
const t0 = T0 - ((T0 - service.phaseS) % service.headwayS);

describe('ScheduleSimulator', () => {
  it('derives trip time and fleet size', () => {
    expect(tripDurationS(service)).toBe(600);
    expect(fleetSize(service)).toBe(5);
  });

  it('has a bus at the first stop at departure time (t = 0)', () => {
    const atStart = activeVehicles(service, t0).filter((v) => v.distanceM === 0);
    expect(atStart).toHaveLength(1);
  });

  it('completes the cycle at the end of the line: a bus never exceeds the line length', () => {
    for (let t = t0; t < t0 + 1200; t += 7) {
      for (const v of activeVehicles(service, t)) {
        expect(v.distanceM).toBeGreaterThanOrEqual(0);
        expect(v.distanceM).toBeLessThan(service.lengthM);
      }
    }
    const index = activeVehicles(service, t0).find((v) => v.distanceM === 0)!.vehicleIndex;
    expect(positionOf(service, index, t0 + 599)).toBeCloseTo(5990, 6);
    // trip finished at the last stop → the same vehicle starts its next cycle from the first stop
    expect(positionOf(service, index, t0 + 600)).toBe(0);
    // a vehicle index beyond the fleet is never on the road
    expect(positionOf(service, 99, t0 + 600)).toBeNull();
  });

  it('keeps consecutive buses one headway apart', () => {
    const distances = activeVehicles(service, t0 + 45).map((v) => v.distanceM);
    expect(distances).toHaveLength(5);
    for (let i = 1; i < distances.length; i++) {
      expect(distances[i]! - distances[i - 1]!).toBeCloseTo(service.headwayS * service.speedMps, 6);
    }
  });

  it('runs more buses when the headway is shorter (peak)', () => {
    const peak = { ...service, headwayS: 84 };
    expect(activeVehicles(peak, t0 + 45).length).toBeGreaterThan(
      activeVehicles(service, t0 + 45).length,
    );
  });

  it('is deterministic and gives each active bus a unique id', () => {
    const a = activeVehicles(service, t0 + 333);
    expect(activeVehicles(service, t0 + 333)).toEqual(a);
    expect(new Set(a.map((v) => v.vehicleId)).size).toBe(a.length);
  });

  it('moves a vehicle forward between ticks without changing its id', () => {
    const before = activeVehicles(service, t0 + 10)[2]!;
    const after = activeVehicles(service, t0 + 12).find((v) => v.vehicleId === before.vehicleId)!;
    expect(after.distanceM - before.distanceM).toBeCloseTo(20, 6);
  });

  it('loops a reserve bus from its dispatch time', () => {
    const reserve = { id: 'r1', routeId: 37, direction: 1, startedAtS: t0 };
    expect(reservePosition(service, reserve, t0 - 1)).toBeNull();
    expect(reservePosition(service, reserve, t0 + 100)).toMatchObject({
      vehicleId: 'reserve-r1',
      distanceM: 1000,
      isReserve: true,
    });
    expect(reservePosition(service, reserve, t0 + 650)!.distanceM).toBeCloseTo(500, 6);
  });
});
