import type { CrowdLevel } from '../../../common/domain/crowd-level';
import type { SimClock } from '../../../common/sim-clock/sim-clock';
import { aggregateRouteCrowd, type RouteCrowd } from '../domain/crowd-aggregator';
import { type CrowdReport, REPORT_WINDOW_MS } from '../domain/crowd-report';
import { buildHeatmap, type HeatCell } from '../domain/heatmap';
import type { CrowdReportRepository, RouteDemandReader } from './crowding.ports';

/** Every SSE client asks every 2 s, so the 10-minute window is read at most once per interval. */
const SNAPSHOT_TTL_MS = 2000;

function groupByRoute(reports: readonly CrowdReport[]): Map<number, CrowdReport[]> {
  const byRoute = new Map<number, CrowdReport[]>();
  for (const report of reports) {
    const list = byRoute.get(report.routeId);
    if (list) list.push(report);
    else byRoute.set(report.routeId, [report]);
  }
  return byRoute;
}

/** Reads the recent window of reports (shared by the queries below). */
export class RecentReports {
  private cache?: { at: number; items: Promise<CrowdReport[]> };

  constructor(
    private readonly reports: CrowdReportRepository,
    private readonly clock: SimClock,
  ) {}

  private since(): Date {
    return new Date(this.clock.now().getTime() - REPORT_WINDOW_MS);
  }

  /** All reports of the last 10 minutes (cached for 2 s). */
  all(): Promise<CrowdReport[]> {
    const nowMs = Date.now();
    if (!this.cache || nowMs - this.cache.at > SNAPSHOT_TTL_MS) {
      const items = this.reports.findSince(this.since());
      items.catch(() => (this.cache = undefined));
      this.cache = { at: nowMs, items };
    }
    return this.cache.items;
  }

  /** Fresh read for one route — dispatch decisions must not use the cache. */
  forRoute(routeId: number): Promise<CrowdReport[]> {
    return this.reports.findSince(this.since(), routeId);
  }
}

/** Current crowd level per route, used by the simulation (vehicle colour) and the passenger UI. */
export class GetRouteCrowdLevels {
  constructor(
    private readonly recent: RecentReports,
    private readonly routes: RouteDemandReader,
    private readonly clock: SimClock,
  ) {}

  async execute(routeIds: readonly number[], now?: Date): Promise<Map<number, CrowdLevel>> {
    const crowd = await this.byRoute(routeIds, now);
    return new Map([...crowd].map(([id, c]) => [id, c.level]));
  }

  async byRoute(routeIds: readonly number[], now?: Date): Promise<Map<number, RouteCrowd>> {
    const at = now ?? this.clock.now();
    const [reports, demands] = await Promise.all([this.recent.all(), this.routes.demands()]);
    const grouped = groupByRoute(reports);
    const result = new Map<number, RouteCrowd>();
    for (const id of routeIds) {
      if (!demands.has(id)) continue;
      result.set(id, aggregateRouteCrowd(grouped.get(id) ?? [], demands.get(id), at));
    }
    return result;
  }
}

export interface RouteCrowdView extends RouteCrowd {
  routeId: number;
}

/** Routes that have passenger reports right now, most crowded first (`/crowding/routes`). */
export class GetReportedRoutes {
  constructor(
    private readonly recent: RecentReports,
    private readonly routes: RouteDemandReader,
    private readonly clock: SimClock,
  ) {}

  async execute(): Promise<RouteCrowdView[]> {
    const now = this.clock.now();
    const [reports, demands] = await Promise.all([this.recent.all(), this.routes.demands()]);
    const views: RouteCrowdView[] = [];
    for (const [routeId, list] of groupByRoute(reports)) {
      views.push({ routeId, ...aggregateRouteCrowd(list, demands.get(routeId), now) });
    }
    return views.sort((a, b) => b.score - a.score || a.routeId - b.routeId);
  }
}

export class GetCrowdHeatmap {
  constructor(
    private readonly recent: RecentReports,
    private readonly clock: SimClock,
  ) {}

  async execute(): Promise<HeatCell[]> {
    return buildHeatmap(await this.recent.all(), this.clock.now());
  }
}
