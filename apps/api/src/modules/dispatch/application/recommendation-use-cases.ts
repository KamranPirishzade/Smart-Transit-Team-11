import { ConflictError, NotFoundError } from '../../../common/errors/domain-errors';
import {
  DISPATCH_RECOMMENDATION_RESOLVED,
  DISPATCH_RESERVE_ADDED,
} from '../../../common/events/domain-events';
import type { EventPublisher } from '../../../common/events/event-publisher';
import type { SimClock } from '../../../common/sim-clock/sim-clock';
import {
  type ActiveReserve,
  type Recommendation,
  type RecommendationStatus,
  reserveDirectionOf,
  type ReserveDispatch,
} from '../domain/recommendation';
import type { RecommendationRepository } from './dispatch.ports';

const DEFAULT_LIMIT = 50;

export class ListRecommendations {
  constructor(private readonly recommendations: RecommendationRepository) {}

  execute(status?: RecommendationStatus, limit = DEFAULT_LIMIT): Promise<Recommendation[]> {
    return this.recommendations.list(status, limit);
  }
}

async function loadPending(
  repository: RecommendationRepository,
  id: string,
): Promise<Recommendation> {
  const recommendation = await repository.findById(id);
  if (!recommendation) throw new NotFoundError('Recommendation', id);
  if (recommendation.status !== 'PENDING') {
    throw new ConflictError(`Recommendation ${id} is already ${recommendation.status}`);
  }
  return recommendation;
}

/** Operator accepts: a ReserveDispatch is created and the simulation adds a reserve bus. */
export class AcceptRecommendation {
  constructor(
    private readonly recommendations: RecommendationRepository,
    private readonly events: EventPublisher,
    private readonly clock: SimClock,
  ) {}

  async execute(id: string, operatorId: string): Promise<ReserveDispatch> {
    const recommendation = await loadPending(this.recommendations, id);
    const reserve = await this.recommendations.accept(
      id,
      operatorId,
      reserveDirectionOf(recommendation),
      this.clock.now(),
    );
    if (!reserve) throw new ConflictError(`Recommendation ${id} is no longer PENDING`);
    this.events.publish(DISPATCH_RECOMMENDATION_RESOLVED, {
      recommendationId: id,
      routeId: recommendation.routeId,
      status: 'ACCEPTED',
    });
    this.events.publish(DISPATCH_RESERVE_ADDED, {
      reserveId: reserve.id,
      routeId: reserve.routeId,
      direction: reserve.direction,
      recommendationId: id,
    });
    return reserve;
  }
}

export class DismissRecommendation {
  constructor(
    private readonly recommendations: RecommendationRepository,
    private readonly events: EventPublisher,
    private readonly clock: SimClock,
  ) {}

  async execute(id: string, operatorId: string): Promise<void> {
    const recommendation = await loadPending(this.recommendations, id);
    const done = await this.recommendations.dismiss(id, operatorId, this.clock.now());
    if (!done) throw new ConflictError(`Recommendation ${id} is no longer PENDING`);
    this.events.publish(DISPATCH_RECOMMENDATION_RESOLVED, {
      recommendationId: id,
      routeId: recommendation.routeId,
      status: 'DISMISSED',
    });
  }
}

/** Reserve buses currently on the road (operator panel list). */
export class ListActiveReserves {
  constructor(private readonly recommendations: RecommendationRepository) {}

  execute(): Promise<ActiveReserve[]> {
    return this.recommendations.listActiveReserves();
  }
}
