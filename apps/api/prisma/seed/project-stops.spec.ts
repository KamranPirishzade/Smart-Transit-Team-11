import type { LonLat } from '../../src/common/geo/geo.types';
import {
  isInRegion,
  median,
  normalizeLine,
  orientLine,
  projectStopsOntoLine,
} from './project-stops';

const straight: LonLat[] = [
  [49.8, 40.4],
  [49.81, 40.4],
  [49.82, 40.4],
];

const distancesOf = (line: LonLat[], stops: LonLat[]): number[] =>
  projectStopsOntoLine(line, stops).map((p) => p.distanceM);

describe('projectStopsOntoLine', () => {
  it('returns increasing distances for stops along the line, with small offsets', () => {
    const projections = projectStopsOntoLine(straight, [
      [49.8, 40.4001],
      [49.805, 40.4001],
      [49.815, 40.3999],
    ]);
    const d = projections.map((p) => p.distanceM);
    expect(d[0]).toBeLessThan(20);
    expect(d[1]!).toBeGreaterThan(d[0]!);
    expect(d[2]!).toBeGreaterThan(d[1]!);
    expect(projections.every((p) => p.offsetM < 15)).toBe(true);
  });

  it('never goes backwards, even for a stop placed behind the previous one', () => {
    const d = distancesOf(straight, [
      [49.815, 40.4],
      [49.805, 40.4],
    ]);
    expect(d[1]).toBe(d[0]);
  });

  it('keeps the first stop of a loop route at the start, not at the (identical) end', () => {
    const loop: LonLat[] = [
      [49.8, 40.4],
      [49.81, 40.4],
      [49.81, 40.41],
      [49.8, 40.41],
      [49.8, 40.4],
    ];
    const d = distancesOf(loop, [
      [49.8, 40.4],
      [49.81, 40.405],
      [49.8, 40.4],
    ]);
    expect(d[0]).toBeLessThan(1);
    expect(d[1]!).toBeGreaterThan(d[0]!);
    expect(d[2]!).toBeGreaterThan(d[1]!);
  });

  it('rejects degenerate lines', () => {
    expect(() => projectStopsOntoLine([[49.8, 40.4]], [])).toThrow();
  });
});

describe('orientLine', () => {
  it('reverses a line drawn from the last stop to the first', () => {
    const { line, endGapM } = orientLine([...straight].reverse(), straight[0]!, straight[2]!);
    expect(line[0]).toEqual(straight[0]);
    expect(endGapM).toBeCloseTo(0, 6);
  });

  it('keeps a correctly oriented line', () => {
    expect(orientLine(straight, straight[0]!, straight[2]!).line).toEqual(straight);
  });
});

describe('coordinate repair', () => {
  it('accepts Baku coordinates and rejects null / out-of-region ones', () => {
    expect(isInRegion(49.85, 40.4)).toBe(true);
    expect(isInRegion(null, null)).toBe(false);
    expect(isInRegion(40.4, 49.85)).toBe(false);
    expect(isInRegion(0, 0)).toBe(false);
  });

  it('swaps a line written as [lat, lon]', () => {
    const result = normalizeLine([
      [40.56028, 49.69679],
      [40.48526, 49.78191],
    ]);
    expect(result?.swapped).toBe(true);
    expect(result?.line[0]).toEqual([49.69679, 40.56028]);
  });

  it('drops a degenerate line and duplicate vertices', () => {
    expect(
      normalizeLine([
        [49.66397, 49.66397],
        [49.66397, 49.66397],
      ]),
    ).toBeNull();
    expect(normalizeLine([straight[0]!, straight[0]!, straight[1]!])?.line).toHaveLength(2);
  });

  it('computes medians', () => {
    expect(median([])).toBe(0);
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
