import path from 'node:path';
import { findWorkspaceRoot } from '../../src/common/config/load-env';
import { buildSeedPlan } from './build-seed-plan';
import { median, projectStopsOntoLine } from './project-stops';
import { loadSeedFiles, type SeedFiles } from './seed-files';

const fixture: SeedFiles = {
  stops: [
    { id: 1, code: 'A', name: 'A', lat: 40.4, lon: 49.8, isTransportHub: true },
    { id: 2, code: 'B', name: 'B', lat: 40.4, lon: 49.81, isTransportHub: false },
    { id: 3, code: 'C', name: 'C', lat: 40.4, lon: 49.82, isTransportHub: false },
    { id: 9, code: 'Z', name: 'Unused', lat: 40.5, lon: 49.9, isTransportHub: false },
    { id: 5, code: 'N', name: 'No coords', lat: null, lon: null, isTransportHub: false },
  ],
  buses: [
    {
      busId: 10,
      number: '5',
      carrier: 'X',
      tariffAzn: 0.6,
      lengthKm: 2,
      durationMin: 10,
      firstPoint: 'A',
      lastPoint: 'C',
      directions: { '1': [1, 2, 3], '2': [3, 2, 5, 1, 404] },
      towards: { '1': 'C', '2': 'A' },
    },
    {
      busId: 12,
      number: '550',
      carrier: null,
      tariffAzn: null,
      lengthKm: 2,
      durationMin: 10,
      firstPoint: 'A',
      lastPoint: 'C',
      directions: { '1': [1, 2, 3] },
    },
    {
      busId: 11,
      number: '110',
      carrier: null,
      tariffAzn: null,
      lengthKm: 1,
      durationMin: 5,
      firstPoint: null,
      lastPoint: null,
      directions: {},
    },
  ],
  // direction 1 drawn backwards and duplicated with a poor match; direction 2 has no geometry
  lines: [
    {
      busId: 10,
      direction: 1,
      coordinates: [
        [49.82, 40.4],
        [49.81, 40.4],
        [49.8, 40.4],
      ],
    },
    {
      busId: 10,
      direction: 1,
      coordinates: [
        [49.9, 40.5],
        [49.95, 40.5],
      ],
    },
    // route 550: a loop several km away from its stops (real AYNA defect)
    {
      busId: 12,
      direction: 1,
      coordinates: [
        [49.8, 40.45],
        [49.82, 40.45],
        [49.82, 40.46],
        [49.8, 40.45],
      ],
    },
  ],
  demandCsv: 'h1,h2,h3\n"2026-01-01 00:00:00,000",5,1000\n',
};

describe('buildSeedPlan (fixture)', () => {
  const plan = buildSeedPlan(fixture);

  it('maps routes with demand from the CSV', () => {
    expect(plan.routes.find((r) => r.id === 10)?.avgDailyPassengers).toBe(1000);
    expect(plan.routes.find((r) => r.id === 11)?.avgDailyPassengers).toBeNull();
  });

  it('chooses the best-matching duplicate line and orients it from the first stop', () => {
    const d1 = plan.directions.find((d) => d.routeId === 10 && d.direction === 1)!;
    expect(d1.geometryFromStops).toBe(false);
    expect(d1.geometry[0]).toEqual([49.8, 40.4]);
    expect(d1.stops.map((s) => s.stopId)).toEqual([1, 2, 3]);
    expect(d1.stops[2]!.distanceFromStartM).toBeCloseTo(d1.lengthM, 0);
  });

  it('builds missing geometry from stops and skips unknown stops with a warning', () => {
    const d2 = plan.directions.find((d) => d.routeId === 10 && d.direction === 2)!;
    expect(d2.geometryFromStops).toBe(true);
    expect(d2.stops).toHaveLength(3);
    expect(plan.warnings.some((w) => w.includes('unknown stop 404'))).toBe(true);
    expect(plan.warnings.some((w) => w.includes('route 110') && w.includes('no directions'))).toBe(
      true,
    );
  });

  it('skips stops without coordinates', () => {
    expect(plan.stops.some((s) => s.id === 5)).toBe(false);
    const d2 = plan.directions.find((d) => d.routeId === 10 && d.direction === 2)!;
    expect(d2.stops.map((s) => s.stopId)).toEqual([3, 2, 1]);
  });

  it('rebuilds a source line that does not fit its stops', () => {
    const d = plan.directions.find((x) => x.routeId === 12)!;
    expect(d.geometryFromStops).toBe(true);
    expect(plan.warnings.some((w) => w.includes('route 550') && w.includes('does not fit'))).toBe(
      true,
    );
  });

  it('limits routes and stops with a route filter', () => {
    const filtered = buildSeedPlan(fixture, { routeIds: new Set([10]) });
    expect(filtered.routes.map((r) => r.id)).toEqual([10]);
    expect(filtered.stops.map((s) => s.id).sort()).toEqual([1, 2, 3]);
  });
});

describe('buildSeedPlan (real AYNA data)', () => {
  const plan = buildSeedPlan(loadSeedFiles(path.join(findWorkspaceRoot()!, 'data', 'seed')));

  it('covers the whole network (6 source stops have null coordinates)', () => {
    expect(plan.routes).toHaveLength(208);
    expect(plan.stops).toHaveLength(3450);
    expect(plan.directions).toHaveLength(402);
  });

  it('keeps every stop close to its line', () => {
    const stopsById = new Map(plan.stops.map((s) => [s.id, s]));
    for (const d of plan.directions) {
      const offsets = projectStopsOntoLine(
        d.geometry,
        d.stops.map((s) => [stopsById.get(s.stopId)!.lon, stopsById.get(s.stopId)!.lat] as const),
      ).map((p) => p.offsetM);
      expect(median(offsets)).toBeLessThanOrEqual(300);
    }
  });

  it('matches the verified sample: route 49 (busId 37) direction 1 starts at "28 May m/st"', () => {
    const d = plan.directions.find((x) => x.routeId === 37 && x.direction === 1)!;
    expect(d.stops).toHaveLength(58);
    expect(d.stops[0]!.stopId).toBe(105);
  });

  it('produces monotonic stop distances within each line length', () => {
    for (const d of plan.directions) {
      d.stops.forEach((s, i) => {
        if (i > 0)
          expect(s.distanceFromStartM).toBeGreaterThanOrEqual(d.stops[i - 1]!.distanceFromStartM);
        expect(s.distanceFromStartM).toBeLessThanOrEqual(d.lengthM + 1);
      });
    }
  });
});
