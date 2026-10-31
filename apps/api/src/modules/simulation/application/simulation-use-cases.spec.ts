import type { CrowdLevel } from '../../../common/domain/crowd-level';
import { NotFoundError } from '../../../common/errors/domain-errors';
import { lineLengthM } from '../../../common/geo/polyline';
import type { LonLat } from '../../../common/geo/geo.types';
import type { SimClock } from '../../../common/sim-clock/sim-clock';
import type { ReserveVehicle } from '../domain/schedule-simulator';
import { DEFAULT_SIMULATION_CONFIG } from '../domain/simulation.config';
import { GetStopArrivals } from './get-stop-arrivals';
import { GetVehicles } from './get-vehicles';
import { SimulationNetwork } from './simulation-network';
import type {
  NetworkDirection,
  ReserveVehicleSource,
  RouteCrowdReader,
  RouteNetworkSource,
} from './simulation.ports';

// ~8.5 km due east, two stops (start + middle) and a last stop
const line: LonLat[] = [
  [49.8, 40.4],
  [49.9, 40.4],
];
const lengthM = lineLengthM(line);
const direction = (routeId: number, routeNumber: string, dir = 1): NetworkDirection => ({
  routeId,
  routeNumber,
  direction: dir,
  towards: 'East',
  lengthM,
  durationMin: 30,
  avgDailyPassengers: 12_000,
  geometry: dir === 1 ? line : [...line].reverse(),
  stops: [
    { stopId: 100, distanceFromStartM: 0 },
    { stopId: 200, distanceFromStartM: lengthM / 2 },
    { stopId: dir === 1 ? 300 : 400, distanceFromStartM: lengthM },
  ],
});

class FakeNetworkSource implements RouteNetworkSource {
  calls = 0;
  constructor(private readonly directions: NetworkDirection[]) {}
  async loadDirections(): Promise<NetworkDirection[]> {
    this.calls++;
    return this.directions;
  }
}

class FakeReserves implements ReserveVehicleSource {
  constructor(public items: ReserveVehicle[] = []) {}
  async activeReserves(): Promise<ReserveVehicle[]> {
    return this.items;
  }
}

class FakeCrowd implements RouteCrowdReader {
  async currentLevels(routeIds: readonly number[]): Promise<ReadonlyMap<number, CrowdLevel>> {
    return new Map(routeIds.filter((id) => id === 37).map((id) => [id, 'CROWDED' as const]));
  }
}

const now = new Date('2026-10-31T08:00:00Z'); // 12:00 Baku, off-peak
const clock: SimClock = { now: () => now };

function setup(reserves: ReserveVehicle[] = []) {
  const source = new FakeNetworkSource([
    direction(37, '49'),
    direction(37, '49', 2),
    direction(5, '5'),
  ]);
  const network = new SimulationNetwork(source);
  const deps = [
    network,
    new FakeReserves(reserves),
    new FakeCrowd(),
    clock,
    DEFAULT_SIMULATION_CONFIG,
  ] as const;
  return {
    source,
    getVehicles: new GetVehicles(...deps),
    getArrivals: new GetStopArrivals(...deps),
  };
}

describe('GetVehicles', () => {
  it('returns vehicles of one route with position, bearing and crowd level', async () => {
    const { getVehicles } = setup();
    const snapshot = await getVehicles.execute({ routeId: 37 });
    expect(snapshot.vehicles.length).toBeGreaterThan(0);
    expect(snapshot.vehicles.every((v) => v.routeId === 37 && v.routeNumber === '49')).toBe(true);
    expect(snapshot.simTime).toBe('12:00');
    const eastbound = snapshot.vehicles.find((v) => v.direction === 1)!;
    expect(eastbound.bearing).toBeGreaterThanOrEqual(89);
    expect(eastbound.bearing).toBeLessThanOrEqual(91);
    expect(eastbound.lat).toBeCloseTo(40.4, 6);
    expect(eastbound.crowdLevel).toBe('CROWDED');
  });

  it('filters by bounding box and reports unknown crowding as null', async () => {
    const { getVehicles } = setup();
    const all = await getVehicles.execute({ routeId: 5 });
    expect(all.vehicles.every((v) => v.crowdLevel === null)).toBe(true);
    const westHalf = await getVehicles.execute({
      bbox: { minLon: 49.79, minLat: 40.39, maxLon: 49.85, maxLat: 40.41 },
    });
    expect(westHalf.vehicles.every((v) => v.lon <= 49.85)).toBe(true);
    expect(westHalf.total).toBeLessThan(
      (await getVehicles.execute({ bbox: { minLon: 49, minLat: 40, maxLon: 50, maxLat: 41 } }))
        .total,
    );
  });

  it('truncates to the limit and says so', async () => {
    const { getVehicles } = setup();
    const snapshot = await getVehicles.execute(
      { bbox: { minLon: 49, minLat: 40, maxLon: 50, maxLat: 41 } },
      2,
    );
    expect(snapshot.vehicles).toHaveLength(2);
    expect(snapshot.truncated).toBe(true);
    expect(snapshot.total).toBeGreaterThan(2);
  });

  it('adds active reserve buses to their direction', async () => {
    const startedAtS = now.getTime() / 1000 - 60;
    const { getVehicles } = setup([{ id: 'r1', routeId: 37, direction: 1, startedAtS }]);
    const reserve = (await getVehicles.execute({ routeId: 37 })).vehicles.find((v) => v.isReserve);
    expect(reserve).toMatchObject({ id: 'reserve-r1', direction: 1 });
  });

  it('loads the static network only once', async () => {
    const { source, getVehicles } = setup();
    await getVehicles.execute({ routeId: 37 });
    await getVehicles.execute({ routeId: 5 });
    expect(source.calls).toBe(1);
  });
});

describe('GetStopArrivals', () => {
  it('lists arrivals from every route serving the stop, soonest first', async () => {
    const { getArrivals } = setup();
    const result = await getArrivals.execute(200, 6);
    expect(result.arrivals).toHaveLength(6);
    expect(new Set(result.arrivals.map((a) => a.routeNumber))).toEqual(new Set(['49', '5']));
    for (let i = 1; i < result.arrivals.length; i++) {
      expect(result.arrivals[i]!.etaS).toBeGreaterThanOrEqual(result.arrivals[i - 1]!.etaS);
    }
    for (const a of result.arrivals) {
      // etaMin is etaS rounded up to whole minutes (etaS itself is rounded to the second)
      expect(a.etaMin * 60).toBeGreaterThanOrEqual(a.etaS - 1);
      expect((a.etaMin - 1) * 60).toBeLessThan(a.etaS + 1);
    }
  });

  it('includes a reserve bus heading to the stop', async () => {
    const startedAtS = now.getTime() / 1000;
    const { getArrivals } = setup([{ id: 'r1', routeId: 37, direction: 1, startedAtS }]);
    const result = await getArrivals.execute(200, 50);
    expect(result.arrivals.some((a) => a.isReserve && a.vehicleId === 'reserve-r1')).toBe(true);
  });

  it('throws NotFoundError for a stop no route serves', async () => {
    await expect(setup().getArrivals.execute(999)).rejects.toBeInstanceOf(NotFoundError);
  });
});
