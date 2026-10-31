import type { CrowdReport } from '../domain/crowd-report';

export const CROWD_REPORT_REPOSITORY = Symbol('CROWD_REPORT_REPOSITORY');
export const ROUTE_DEMAND_READER = Symbol('ROUTE_DEMAND_READER');

export interface CrowdReportRepository {
  save(report: CrowdReport): Promise<void>;
  /** Reports created at or after `since`, optionally for one route. */
  findSince(since: Date, routeId?: number): Promise<CrowdReport[]>;
}

/** Average daily passengers per route; every existing route is a key (null = unknown demand). */
export interface RouteDemandReader {
  demands(): Promise<ReadonlyMap<number, number | null>>;
}
