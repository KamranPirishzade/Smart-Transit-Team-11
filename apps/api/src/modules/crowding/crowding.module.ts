import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { EVENT_PUBLISHER, type EventPublisher } from '../../common/events/event-publisher';
import { SIM_CLOCK, type SimClock } from '../../common/sim-clock/sim-clock';
import { NetworkModule } from '../network/public-api';
import {
  GetCrowdHeatmap,
  GetReportedRoutes,
  GetRouteCrowdLevels,
  RecentReports,
} from './application/crowd-queries';
import {
  CROWD_REPORT_REPOSITORY,
  ROUTE_DEMAND_READER,
  type CrowdReportRepository,
  type RouteDemandReader,
} from './application/crowding.ports';
import { SubmitCrowdReport } from './application/submit-crowd-report';
import { NetworkRouteDemandReader } from './infrastructure/network-route-demand.reader';
import { PrismaCrowdReportRepository } from './infrastructure/prisma-crowd-report.repository';
import { CrowdingController } from './presentation/crowding.controller';
import { DeviceThrottlerGuard, REPORT_RATE_LIMIT } from './presentation/device-throttler.guard';

@Module({
  imports: [NetworkModule, ThrottlerModule.forRoot([{ name: 'default', ...REPORT_RATE_LIMIT }])],
  controllers: [CrowdingController],
  providers: [
    DeviceThrottlerGuard,
    { provide: CROWD_REPORT_REPOSITORY, useClass: PrismaCrowdReportRepository },
    { provide: ROUTE_DEMAND_READER, useClass: NetworkRouteDemandReader },
    {
      provide: RecentReports,
      useFactory: (r: CrowdReportRepository, c: SimClock) => new RecentReports(r, c),
      inject: [CROWD_REPORT_REPOSITORY, SIM_CLOCK],
    },
    {
      provide: SubmitCrowdReport,
      useFactory: (
        r: CrowdReportRepository,
        d: RouteDemandReader,
        e: EventPublisher,
        c: SimClock,
      ) => new SubmitCrowdReport(r, d, e, c),
      inject: [CROWD_REPORT_REPOSITORY, ROUTE_DEMAND_READER, EVENT_PUBLISHER, SIM_CLOCK],
    },
    {
      provide: GetRouteCrowdLevels,
      useFactory: (r: RecentReports, d: RouteDemandReader, c: SimClock) =>
        new GetRouteCrowdLevels(r, d, c),
      inject: [RecentReports, ROUTE_DEMAND_READER, SIM_CLOCK],
    },
    {
      provide: GetReportedRoutes,
      useFactory: (r: RecentReports, d: RouteDemandReader, c: SimClock) =>
        new GetReportedRoutes(r, d, c),
      inject: [RecentReports, ROUTE_DEMAND_READER, SIM_CLOCK],
    },
    {
      provide: GetCrowdHeatmap,
      useFactory: (r: RecentReports, c: SimClock) => new GetCrowdHeatmap(r, c),
      inject: [RecentReports, SIM_CLOCK],
    },
  ],
  exports: [GetRouteCrowdLevels, GetReportedRoutes, RecentReports],
})
export class CrowdingModule {}
