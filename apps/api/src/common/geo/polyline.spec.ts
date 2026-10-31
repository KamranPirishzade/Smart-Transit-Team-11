import type { LonLat } from './geo.types';
import { haversineM } from './haversine';
import {
  bearingAtDistance,
  bearingDeg,
  cumulativeDistances,
  lineLengthM,
  pointAtDistance,
  projectOntoLine,
} from './polyline';

// ~1.1 km due east steps along a parallel near Baku
const line: LonLat[] = [
  [49.8, 40.4],
  [49.81, 40.4],
  [49.82, 40.4],
];

describe('haversineM', () => {
  it('is zero for the same point and symmetric', () => {
    expect(haversineM([49.8, 40.4], [49.8, 40.4])).toBe(0);
    expect(haversineM(line[0]!, line[1]!)).toBeCloseTo(haversineM(line[1]!, line[0]!), 6);
  });

  it('matches a known distance (0.01° lon at 40.4°N ≈ 847 m)', () => {
    expect(haversineM(line[0]!, line[1]!)).toBeGreaterThan(840);
    expect(haversineM(line[0]!, line[1]!)).toBeLessThan(855);
  });
});

describe('polyline', () => {
  const cum = cumulativeDistances(line);

  it('accumulates distances monotonically', () => {
    expect(cum[0]).toBe(0);
    expect(cum[2]).toBeCloseTo(lineLengthM(line), 6);
    expect(cum[1]!).toBeLessThan(cum[2]!);
    expect(lineLengthM([])).toBe(0);
  });

  it('projects a point beside the line onto the right segment', () => {
    const [best] = projectOntoLine(line, cum, [49.815, 40.4005], 0).sort(
      (a, b) => a.offsetM - b.offsetM,
    );
    expect(best!.segmentIndex).toBe(1);
    expect(best!.distanceAlongM).toBeCloseTo(cum[1]! + (cum[2]! - cum[1]!) / 2, -1);
    expect(best!.offsetM).toBeGreaterThan(50);
    expect(best!.offsetM).toBeLessThan(60);
  });

  it('respects the starting segment', () => {
    const candidates = projectOntoLine(line, cum, line[0]!, 1);
    expect(candidates.every((c) => c.segmentIndex >= 1)).toBe(true);
  });

  it('interpolates and clamps pointAtDistance', () => {
    expect(pointAtDistance(line, cum, -5)).toEqual(line[0]);
    expect(pointAtDistance(line, cum, 1e9)).toEqual(line[2]);
    const mid = pointAtDistance(line, cum, cum[1]! / 2);
    expect(mid[0]).toBeCloseTo(49.805, 4);
    expect(() => pointAtDistance([], [], 1)).toThrow();
  });
});

describe('bearing', () => {
  it('points east along a parallel and north along a meridian', () => {
    expect(bearingDeg([49.8, 40.4], [49.81, 40.4])).toBeCloseTo(90, 0);
    expect(bearingDeg([49.8, 40.4], [49.8, 40.41])).toBeCloseTo(0, 5);
    expect(bearingDeg([49.8, 40.41], [49.8, 40.4])).toBeCloseTo(180, 5);
  });

  it('uses the segment that contains the distance', () => {
    const bent: LonLat[] = [
      [49.8, 40.4],
      [49.81, 40.4],
      [49.81, 40.41],
    ];
    const cum = cumulativeDistances(bent);
    expect(bearingAtDistance(bent, cum, 10)).toBeCloseTo(90, 0);
    expect(bearingAtDistance(bent, cum, cum[1]! + 10)).toBeCloseTo(0, 0);
    expect(bearingAtDistance([bent[0]!], [0], 0)).toBe(0);
  });
});
