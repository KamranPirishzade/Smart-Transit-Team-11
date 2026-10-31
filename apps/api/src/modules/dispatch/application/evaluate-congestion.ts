import { DISPATCH_RECOMMENDATION_CREATED } from '../../../common/events/domain-events';
import type { EventPublisher } from '../../../common/events/event-publisher';
import type { SimClock } from '../../../common/sim-clock/sim-clock';
import { describeCongestion, evaluateCongestion } from '../domain/congestion-rule';
import type { Recommendation } from '../domain/recommendation';
import type { CrowdSignals, RecommendationRepository } from './dispatch.ports';

/** Runs the congestion rule for a route after a new report and files a recommendation when it fires. */
export class EvaluateCongestion {
  constructor(
    private readonly signals: CrowdSignals,
    private readonly recommendations: RecommendationRepository,
    private readonly events: EventPublisher,
    private readonly clock: SimClock,
  ) {}

  async execute(routeId: number): Promise<Recommendation | null> {
    const [reports, hasPending] = await Promise.all([
      this.signals.routeReports(routeId),
      this.recommendations.hasPending(routeId),
    ]);
    const verdict = evaluateCongestion({
      reports,
      now: this.clock.now(),
      hasPendingRecommendation: hasPending,
    });
    if (!verdict.triggered) return null;

    const created = await this.recommendations.createPending({
      routeId,
      direction: verdict.direction,
      reason: describeCongestion(verdict),
      highReports: verdict.highReports,
      totalReports: verdict.totalReports,
      windowStart: verdict.windowStart,
      windowEnd: verdict.windowEnd,
    });
    if (!created) return null; // lost the race against a concurrent evaluation
    this.events.publish(DISPATCH_RECOMMENDATION_CREATED, {
      recommendationId: created.id,
      routeId,
      direction: created.direction,
      highReports: created.highReports,
      totalReports: created.totalReports,
    });
    return created;
  }
}
