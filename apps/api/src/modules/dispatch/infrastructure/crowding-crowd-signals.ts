import { Injectable } from '@nestjs/common';
import { GetReportedRoutes, RecentReports } from '../../crowding/public-api';
import type { CrowdSignals, ReportedRouteSample } from '../application/dispatch.ports';
import type { ReportSample } from '../domain/congestion-rule';

/** Dispatch reads passenger reports from the crowding module through its public API. */
@Injectable()
export class CrowdingCrowdSignals implements CrowdSignals {
  constructor(
    private readonly recent: RecentReports,
    private readonly reported: GetReportedRoutes,
  ) {}

  async routeReports(routeId: number): Promise<ReportSample[]> {
    const reports = await this.recent.forRoute(routeId);
    return reports.map((r) => ({ level: r.level, direction: r.direction, createdAt: r.createdAt }));
  }

  async reportedRoutes(): Promise<ReportedRouteSample[]> {
    const routes = await this.reported.execute();
    return routes.map(({ routeId, level, score, reportCount }) => ({
      routeId,
      level,
      score,
      reportCount,
    }));
  }
}
