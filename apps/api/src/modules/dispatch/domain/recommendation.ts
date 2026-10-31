export type RecommendationStatus = 'PENDING' | 'ACCEPTED' | 'DISMISSED';

export interface Recommendation {
  id: string;
  routeId: number;
  routeNumber: string;
  direction: number | null;
  reason: string;
  highReports: number;
  totalReports: number;
  windowStart: Date;
  windowEnd: Date;
  status: RecommendationStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  resolvedBy: string | null;
}

export interface ReserveDispatch {
  id: string;
  routeId: number;
  direction: number;
  recommendationId: string | null;
  active: boolean;
  createdAt: Date;
}

/** A reserve bus needs a direction; without a dominant one the recommendation falls back to direction 1. */
export const DEFAULT_RESERVE_DIRECTION = 1;

export function reserveDirectionOf(recommendation: Pick<Recommendation, 'direction'>): number {
  return recommendation.direction ?? DEFAULT_RESERVE_DIRECTION;
}
