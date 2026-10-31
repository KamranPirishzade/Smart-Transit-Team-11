import { mergeArrivals, regularArrivals, reserveArrivals } from './eta-calculator';
import { activeVehicles } from './schedule-simulator';
import type { DirectionService } from './service-plan';

const service: DirectionService = {
  routeId: 37,
  direction: 1,
  lengthM: 6000,
  headwayS: 120,
  speedMps: 10,
  phaseS: 30,
};
const now = 1_800_000_017;

describe('EtaCalculator', () => {
  it('returns non-negative ETAs one headway apart', () => {
    const arrivals = regularArrivals(service, 3000, now, 4);
    expect(arrivals.every((a) => a.etaS >= 0)).toBe(true);
    expect(arrivals[1]!.etaS - arrivals[0]!.etaS).toBeCloseTo(120, 6);
  });

  it('agrees with the simulated positions of buses approaching the stop', () => {
    const stopM = 3000;
    const [next] = regularArrivals(service, stopM, now, 1);
    const approaching = activeVehicles(service, now)
      .filter((v) => v.distanceM <= stopM)
      .sort((a, b) => b.distanceM - a.distanceM)[0]!;
    expect(next!.vehicleId).toBe(approaching.vehicleId);
    expect(next!.etaS).toBeCloseTo((stopM - approaching.distanceM) / service.speedMps, 6);
  });

  it('skips a bus that has just passed the stop and takes the next one', () => {
    const stopM = 3000;
    const passed = activeVehicles(service, now).find((v) => v.distanceM > stopM)!;
    const arrivals = regularArrivals(service, stopM, now, 3);
    expect(arrivals.map((a) => a.vehicleId)).not.toContain(passed.vehicleId);
  });

  it('returns ETA 0 for a bus exactly at the stop', () => {
    const atStop = activeVehicles(service, now)[1]!;
    const [first] = regularArrivals(service, atStop.distanceM, now, 1);
    expect(first!.etaS).toBeCloseTo(0, 6);
  });

  it('computes reserve bus arrivals per loop', () => {
    const reserve = { id: 'r1', routeId: 37, direction: 1, startedAtS: now - 100 };
    const [a, b] = reserveArrivals(service, reserve, 3000, now, 2);
    expect(a).toMatchObject({ vehicleId: 'reserve-r1', isReserve: true });
    expect(a!.etaS).toBeCloseTo(200, 6);
    expect(b!.etaS - a!.etaS).toBeCloseTo(600, 6);
  });

  it('sorts merged arrivals by ETA and applies the limit', () => {
    const merged = mergeArrivals(
      [
        regularArrivals(service, 3000, now, 3),
        regularArrivals({ ...service, routeId: 5, phaseS: 90 }, 1000, now, 3),
      ],
      4,
    );
    expect(merged).toHaveLength(4);
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i]!.etaS).toBeGreaterThanOrEqual(merged[i - 1]!.etaS);
    }
  });
});
