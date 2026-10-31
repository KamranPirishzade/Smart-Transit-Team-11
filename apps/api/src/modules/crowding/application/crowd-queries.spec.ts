import {
  GetCrowdHeatmap,
  GetReportedRoutes,
  GetRouteCrowdLevels,
  RecentReports,
} from './crowd-queries';
import {
  aReport,
  demands,
  fixedClock,
  InMemoryReports,
  minutesBefore,
  NOW,
} from './crowding.fakes';

function setup(...items: ReturnType<typeof aReport>[]) {
  const reports = new InMemoryReports();
  reports.items.push(...items);
  return { reports, recent: new RecentReports(reports, fixedClock) };
}

describe('GetRouteCrowdLevels', () => {
  it('returns the report level for reported routes and the baseline for others', async () => {
    const { recent } = setup(aReport({ level: 'EMPTY' }));
    const levels = await new GetRouteCrowdLevels(recent, demands, fixedClock).execute([
      49, 12, 777,
    ]);
    expect(levels.get(49)).toBe('EMPTY');
    expect(levels.has(12)).toBe(true);
    expect(levels.has(777)).toBe(false);
  });

  it('reads the report window once for repeated calls (2 s cache)', async () => {
    const { reports, recent } = setup();
    const useCase = new GetRouteCrowdLevels(recent, demands, fixedClock);
    await useCase.execute([49]);
    await useCase.execute([49]);
    expect(reports.findCalls).toBe(1);
  });

  it('ignores reports older than 10 minutes', async () => {
    const { recent } = setup(aReport({ level: 'FULL', createdAt: minutesBefore(NOW, 11) }));
    const crowd = await new GetRouteCrowdLevels(recent, demands, fixedClock).byRoute([49]);
    expect(crowd.get(49)?.source).toBe('baseline');
  });
});

describe('GetReportedRoutes', () => {
  it('lists only routes with reports, most crowded first', async () => {
    const { recent } = setup(
      aReport({ id: 'a', routeId: 12, level: 'MODERATE' }),
      aReport({ id: 'b', routeId: 49, level: 'FULL' }),
    );
    const routes = await new GetReportedRoutes(recent, demands, fixedClock).execute();
    expect(routes.map((r) => r.routeId)).toEqual([49, 12]);
    expect(routes[0]).toMatchObject({ level: 'FULL', source: 'reports', reportCount: 1 });
  });
});

describe('GetCrowdHeatmap', () => {
  it('builds cells from recent reports', async () => {
    const { recent } = setup(aReport({}), aReport({ id: 'x', lat: 40.5 }));
    expect(await new GetCrowdHeatmap(recent, fixedClock).execute()).toHaveLength(2);
  });
});

describe('RecentReports.forRoute', () => {
  it('always reads fresh data for one route', async () => {
    const { reports, recent } = setup(aReport({}), aReport({ id: 'o', routeId: 12 }));
    expect(await recent.forRoute(49)).toHaveLength(1);
    await recent.forRoute(49);
    expect(reports.findCalls).toBe(2);
  });
});
