import { NotFoundError } from '../../../common/errors/domain-errors';
import { bboxContains, type BBox } from '../../../common/geo/bbox';
import type { RouteDetails, RouteSummary } from '../domain/route';
import type { Stop, StopDetails } from '../domain/stop';
import type { RouteRepository, StopRepository } from './network.ports';
import { GetRouteDetails, SearchRoutes } from './route-queries';
import { FindNearbyStops, GetStopDetails } from './stop-queries';

const summary = (id: number, number: string, hasStops = true): RouteSummary => ({
  id,
  number,
  carrier: null,
  tariffAzn: 0.6,
  firstPoint: 'A',
  lastPoint: 'B',
  hasStops,
});

class InMemoryRoutes implements RouteRepository {
  constructor(private readonly items: RouteSummary[]) {}
  async listSummaries(): Promise<RouteSummary[]> {
    return this.items;
  }
  async findDetails(id: number): Promise<RouteDetails | null> {
    const s = this.items.find((r) => r.id === id);
    return s
      ? { ...s, lengthKm: 10, durationMin: 30, avgDailyPassengers: null, directions: [] }
      : null;
  }
}

class InMemoryStops implements StopRepository {
  lastBox?: BBox;
  constructor(private readonly items: Stop[]) {}
  async findInBox(box: BBox): Promise<Stop[]> {
    this.lastBox = box;
    return this.items.filter((s) => bboxContains(box, [s.lon, s.lat]));
  }
  async findDetails(id: number): Promise<StopDetails | null> {
    const s = this.items.find((x) => x.id === id);
    return s ? { ...s, routes: [] } : null;
  }
}

const stop = (id: number, lon: number): Stop => ({
  id,
  code: String(id),
  name: `S${id}`,
  lat: 40.4,
  lon,
  isHub: false,
});

describe('SearchRoutes', () => {
  const repo = new InMemoryRoutes([summary(37, '49'), summary(76, '110', false), summary(1, '4')]);

  it('returns every route, including those without stops, flagged with hasStops', async () => {
    const all = await new SearchRoutes(repo).execute();
    expect(all.map((r) => r.number)).toEqual(['4', '49', '110']);
    expect(all.find((r) => r.number === '110')?.hasStops).toBe(false);
  });

  it('filters by query and honours the limit', async () => {
    expect((await new SearchRoutes(repo).execute('4')).map((r) => r.number)).toEqual(['4', '49']);
    expect(await new SearchRoutes(repo).execute('', 1)).toHaveLength(1);
  });
});

describe('GetRouteDetails', () => {
  it('returns the route or throws NotFoundError', async () => {
    const useCase = new GetRouteDetails(new InMemoryRoutes([summary(37, '49')]));
    await expect(useCase.execute(37)).resolves.toMatchObject({ number: '49' });
    await expect(useCase.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('FindNearbyStops', () => {
  it('pre-filters by box and returns stops within the radius', async () => {
    const repo = new InMemoryStops([stop(1, 49.851), stop(2, 49.86), stop(3, 49.9)]);
    const result = await new FindNearbyStops(repo).execute({ lat: 40.4, lon: 49.85, radiusM: 500 });
    expect(result.map((s) => s.id)).toEqual([1]);
    expect(repo.lastBox).toBeDefined();
  });

  it('caps the radius at 3 km', async () => {
    const repo = new InMemoryStops([stop(3, 49.9)]); // ~4.2 km away
    const result = await new FindNearbyStops(repo).execute({
      lat: 40.4,
      lon: 49.85,
      radiusM: 10_000,
    });
    expect(result).toEqual([]);
  });
});

describe('GetStopDetails', () => {
  it('returns the stop or throws NotFoundError', async () => {
    const useCase = new GetStopDetails(new InMemoryStops([stop(105, 49.85)]));
    await expect(useCase.execute(105)).resolves.toMatchObject({ name: 'S105', routes: [] });
    await expect(useCase.execute(1)).rejects.toBeInstanceOf(NotFoundError);
  });
});
