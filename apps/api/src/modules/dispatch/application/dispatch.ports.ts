import type {
  Recommendation,
  RecommendationStatus,
  ReserveDispatch,
  ActiveReserve,
} from '../domain/recommendation';
import type { ReportSample } from '../domain/congestion-rule';

export const RECOMMENDATION_REPOSITORY = Symbol('RECOMMENDATION_REPOSITORY');
export const CROWD_SIGNALS = Symbol('CROWD_SIGNALS');

export type NewRecommendation = Omit<
  Recommendation,
  'id' | 'status' | 'createdAt' | 'resolvedAt' | 'resolvedBy' | 'routeNumber'
>;

export interface RecommendationRepository {
  /**
   * Stores a PENDING recommendation. Returns null when the route already has one: the DB has a partial
   * unique index (one PENDING per route), so two concurrent evaluations cannot both succeed.
   */
  createPending(input: NewRecommendation): Promise<Recommendation | null>;
  hasPending(routeId: number): Promise<boolean>;
  findById(id: string): Promise<Recommendation | null>;
  list(status: RecommendationStatus | undefined, limit: number): Promise<Recommendation[]>;
  /**
   * Atomically moves a PENDING recommendation to ACCEPTED and creates its reserve dispatch.
   * Returns null when it was not PENDING any more (resolved by someone else in the meantime).
   */
  accept(
    id: string,
    operatorId: string,
    direction: number,
    at: Date,
  ): Promise<ReserveDispatch | null>;
  /** Returns false when it was not PENDING any more. */
  dismiss(id: string, operatorId: string, at: Date): Promise<boolean>;
  countPending(): Promise<number>;
  countActiveReserves(): Promise<number>;
  /** Active reserve buses, newest first. */
  listActiveReserves(): Promise<ActiveReserve[]>;
}

export interface ReportedRouteSample {
  routeId: number;
  level: string;
  score: number;
  reportCount: number;
}

/** What dispatch needs to know about passenger reports (bound to the crowding module). */
export interface CrowdSignals {
  /** Reports of one route in the last 10 minutes. */
  routeReports(routeId: number): Promise<ReportSample[]>;
  /** Routes that have reports right now, most crowded first. */
  reportedRoutes(): Promise<ReportedRouteSample[]>;
}
