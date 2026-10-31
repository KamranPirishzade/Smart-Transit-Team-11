import { Module } from '@nestjs/common';
import { EVENT_PUBLISHER, type EventPublisher } from '../../common/events/event-publisher';
import {
  SIM_CLOCK,
  SIM_CLOCK_CONTROL,
  type SimClock,
  type SimClockControl,
} from '../../common/sim-clock/sim-clock';
import { AuthModule } from '../auth/public-api';
import { CrowdingModule } from '../crowding/public-api';
import {
  CROWD_SIGNALS,
  RECOMMENDATION_REPOSITORY,
  type CrowdSignals,
  type RecommendationRepository,
} from './application/dispatch.ports';
import { EvaluateCongestion } from './application/evaluate-congestion';
import { GetOperatorOverview, SetSimClock } from './application/operator-overview';
import {
  AcceptRecommendation,
  DismissRecommendation,
  ListRecommendations,
} from './application/recommendation-use-cases';
import { CrowdingCrowdSignals } from './infrastructure/crowding-crowd-signals';
import { PrismaRecommendationRepository } from './infrastructure/prisma-recommendation.repository';
import { CongestionListener } from './presentation/congestion.listener';
import { OperatorController } from './presentation/operator.controller';

@Module({
  imports: [AuthModule, CrowdingModule],
  controllers: [OperatorController],
  providers: [
    CongestionListener,
    { provide: RECOMMENDATION_REPOSITORY, useClass: PrismaRecommendationRepository },
    { provide: CROWD_SIGNALS, useClass: CrowdingCrowdSignals },
    {
      provide: EvaluateCongestion,
      useFactory: (s: CrowdSignals, r: RecommendationRepository, e: EventPublisher, c: SimClock) =>
        new EvaluateCongestion(s, r, e, c),
      inject: [CROWD_SIGNALS, RECOMMENDATION_REPOSITORY, EVENT_PUBLISHER, SIM_CLOCK],
    },
    {
      provide: ListRecommendations,
      useFactory: (r: RecommendationRepository) => new ListRecommendations(r),
      inject: [RECOMMENDATION_REPOSITORY],
    },
    {
      provide: AcceptRecommendation,
      useFactory: (r: RecommendationRepository, e: EventPublisher, c: SimClock) =>
        new AcceptRecommendation(r, e, c),
      inject: [RECOMMENDATION_REPOSITORY, EVENT_PUBLISHER, SIM_CLOCK],
    },
    {
      provide: DismissRecommendation,
      useFactory: (r: RecommendationRepository, e: EventPublisher, c: SimClock) =>
        new DismissRecommendation(r, e, c),
      inject: [RECOMMENDATION_REPOSITORY, EVENT_PUBLISHER, SIM_CLOCK],
    },
    {
      provide: GetOperatorOverview,
      useFactory: (r: RecommendationRepository, s: CrowdSignals, c: SimClockControl) =>
        new GetOperatorOverview(r, s, c),
      inject: [RECOMMENDATION_REPOSITORY, CROWD_SIGNALS, SIM_CLOCK_CONTROL],
    },
    {
      provide: SetSimClock,
      useFactory: (c: SimClockControl) => new SetSimClock(c),
      inject: [SIM_CLOCK_CONTROL],
    },
  ],
  exports: [GetOperatorOverview],
})
export class DispatchModule {}
