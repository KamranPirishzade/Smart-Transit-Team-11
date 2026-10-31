import {
  baseHeadwayMin,
  baseSpeedKmh,
  type DirectionProfile,
  isPeak,
  serviceAt,
  stableHash,
} from './service-plan';
import { DEFAULT_SIMULATION_CONFIG as cfg } from './simulation.config';

const route49: DirectionProfile = {
  routeId: 37,
  direction: 1,
  lengthM: 22_700,
  durationMin: 72,
  avgDailyPassengers: 16_038,
};

describe('service plan', () => {
  it('recognises peak windows (07:30–09:30, 17:30–19:30)', () => {
    expect(isPeak(7 * 60 + 29, cfg)).toBe(false);
    expect(isPeak(7 * 60 + 30, cfg)).toBe(true);
    expect(isPeak(9 * 60 + 30, cfg)).toBe(false);
    expect(isPeak(18 * 60, cfg)).toBe(true);
  });

  it('derives headway from demand, clamped, with a default when data is missing', () => {
    expect(baseHeadwayMin(16_038, cfg)).toBeCloseTo(6.36, 1);
    expect(baseHeadwayMin(500, cfg)).toBe(cfg.maxHeadwayMin);
    expect(baseHeadwayMin(1_000_000, cfg)).toBe(cfg.minHeadwayMin);
    expect(baseHeadwayMin(null, cfg)).toBe(cfg.defaultHeadwayMin);
  });

  it('derives speed from one-way length and duration, clamped', () => {
    expect(baseSpeedKmh(22_700, 72, cfg)).toBeCloseTo(18.9, 1);
    expect(baseSpeedKmh(22_700, 5, cfg)).toBe(cfg.maxSpeedKmh);
    expect(baseSpeedKmh(22_700, 0, cfg)).toBe(cfg.defaultSpeedKmh);
  });

  it('shortens headway and slows down during peaks', () => {
    const offPeak = serviceAt(route49, 12 * 60, cfg);
    const peak = serviceAt(route49, 8 * 60, cfg);
    expect(peak.headwayS).toBeLessThan(offPeak.headwayS);
    expect(peak.headwayS).toBeCloseTo(offPeak.headwayS * 0.7, -1);
    expect(peak.speedMps).toBeCloseTo(offPeak.speedMps * 0.7, 6);
  });

  it('has a stable phase within the headway', () => {
    const a = serviceAt(route49, 600, cfg);
    expect(a.phaseS).toBe(serviceAt(route49, 600, cfg).phaseS);
    expect(a.phaseS).toBeGreaterThanOrEqual(0);
    expect(a.phaseS).toBeLessThan(a.headwayS);
    expect(stableHash('37:1')).not.toBe(stableHash('37:2'));
  });
});
