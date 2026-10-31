import { selectNearbyStops, type Stop } from './stop';

const stop = (id: number, lon: number, lat: number): Stop => ({
  id,
  code: String(id),
  name: `Stop ${id}`,
  lat,
  lon,
  isHub: false,
});

describe('selectNearbyStops', () => {
  const origin = [49.85, 40.4] as const;
  // ~85 m, ~420 m and ~850 m east of the origin
  const candidates = [stop(3, 49.86, 40.4), stop(1, 49.851, 40.4), stop(2, 49.855, 40.4)];

  it('keeps stops inside the radius, nearest first, with rounded distances', () => {
    const result = selectNearbyStops(candidates, origin, 500, 10);
    expect(result.map((s) => s.id)).toEqual([1, 2]);
    expect(Number.isInteger(result[0]!.distanceM)).toBe(true);
    expect(result[0]!.distanceM).toBeGreaterThan(80);
  });

  it('applies the limit', () => {
    expect(selectNearbyStops(candidates, origin, 5000, 1).map((s) => s.id)).toEqual([1]);
  });
});
