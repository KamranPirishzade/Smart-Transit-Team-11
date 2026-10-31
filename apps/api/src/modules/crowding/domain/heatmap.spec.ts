import type { CrowdReport } from './crowd-report';
import { buildHeatmap } from './heatmap';

const NOW = new Date('2026-10-31T06:00:00Z');

function report(partial: Partial<CrowdReport>): CrowdReport {
  return {
    id: 'r',
    routeId: 49,
    direction: 1,
    vehicleId: null,
    stopId: null,
    level: 'CROWDED',
    lat: 40.38,
    lon: 49.85,
    deviceId: 'device-1',
    createdAt: NOW,
    ...partial,
  };
}

describe('buildHeatmap', () => {
  it('puts nearby reports into one ~250 m cell and averages them', () => {
    const cells = buildHeatmap(
      [report({ level: 'FULL' }), report({ level: 'CROWDED', lat: 40.3803, lon: 49.8504 })],
      NOW,
    );
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ reportCount: 2, level: 'FULL' });
    expect(Math.abs(cells[0]!.lat - 40.38)).toBeLessThan(0.002);
  });

  it('separates reports that are far apart', () => {
    expect(buildHeatmap([report({}), report({ lat: 40.42 })], NOW)).toHaveLength(2);
  });

  it('drops reports older than 10 minutes', () => {
    const old = new Date(NOW.getTime() - 11 * 60_000);
    expect(buildHeatmap([report({ createdAt: old })], NOW)).toEqual([]);
  });
});
