import type { CrowdLevel } from '../domain/crowd-level';

/** Event names: reactions across modules go through these instead of direct calls. */
export const CROWD_REPORT_SUBMITTED = 'crowd.report.submitted';
export const DISPATCH_RECOMMENDATION_CREATED = 'dispatch.recommendation.created';
export const DISPATCH_RECOMMENDATION_RESOLVED = 'dispatch.recommendation.resolved';
export const DISPATCH_RESERVE_ADDED = 'dispatch.reserve.added';

export interface CrowdReportSubmitted {
  reportId: string;
  routeId: number;
  direction: number | null;
  level: CrowdLevel;
  at: string;
}

export interface RecommendationCreated {
  recommendationId: string;
  routeId: number;
  direction: number | null;
  highReports: number;
  totalReports: number;
}

export interface RecommendationResolved {
  recommendationId: string;
  routeId: number;
  status: 'ACCEPTED' | 'DISMISSED';
}

export interface ReserveAdded {
  reserveId: string;
  routeId: number;
  direction: number;
  recommendationId: string | null;
}

export interface DomainEventMap {
  [CROWD_REPORT_SUBMITTED]: CrowdReportSubmitted;
  [DISPATCH_RECOMMENDATION_CREATED]: RecommendationCreated;
  [DISPATCH_RECOMMENDATION_RESOLVED]: RecommendationResolved;
  [DISPATCH_RESERVE_ADDED]: ReserveAdded;
}
