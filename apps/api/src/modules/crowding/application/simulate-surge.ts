import { NotFoundError } from '../../../common/errors/domain-errors';
import type { CrowdLevel } from '../../../common/domain/crowd-level';
import type { SubmitCrowdReport } from './submit-crowd-report';

export const ROUTE_LOCATOR = Symbol('ROUTE_LOCATOR');

export interface LocatedRoute {
  id: number;
  number: string;
  /** A point on the route (its first stop), used as the report position. */
  lat: number;
  lon: number;
}

/** Finds a route by its public bus number (e.g. "49"). */
export interface RouteLocator {
  findByNumber(routeNumber: string): Promise<LocatedRoute | null>;
}

export interface SurgeResult {
  routeId: number;
  routeNumber: string;
  reports: number;
}

/** Enough CROWDED/FULL reports to trip the congestion rule (≥ 8 high, ≥ 60%). */
export const DEFAULT_SURGE_REPORTS = 10;
const SURGE_LEVELS: readonly CrowdLevel[] = ['FULL', 'CROWDED'];

/**
 * Demo: floods one route with high-crowd reports from distinct anonymous devices. The reports go
 * through the normal SubmitCrowdReport flow, so the congestion rule reacts exactly as in real use.
 */
export class SimulateSurge {
  constructor(
    private readonly routes: RouteLocator,
    private readonly submit: Pick<SubmitCrowdReport, 'execute'>,
    private readonly runId: () => string = () => Date.now().toString(36),
  ) {}

  async execute(routeNumber: string, count = DEFAULT_SURGE_REPORTS): Promise<SurgeResult> {
    const route = await this.routes.findByNumber(routeNumber.trim());
    if (!route) throw new NotFoundError('Route', routeNumber);

    const run = this.runId();
    for (let i = 0; i < count; i += 1) {
      await this.submit.execute({
        routeId: route.id,
        direction: 1,
        level: SURGE_LEVELS[i % SURGE_LEVELS.length]!,
        lat: route.lat,
        lon: route.lon,
        deviceId: `demo-surge-${run}-${i}`,
      });
    }
    return { routeId: route.id, routeNumber: route.number, reports: count };
  }
}
