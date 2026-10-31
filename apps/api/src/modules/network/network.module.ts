import { Module } from '@nestjs/common';
import {
  ROUTE_REPOSITORY,
  STOP_REPOSITORY,
  type RouteRepository,
  type StopRepository,
} from './application/network.ports';
import {
  GetRouteDemand,
  ROUTE_DEMAND_SOURCE,
  type RouteDemandSource,
} from './application/route-demand';
import { GetRouteDetails, SearchRoutes } from './application/route-queries';
import { FindNearbyStops, GetStopDetails } from './application/stop-queries';
import { PrismaRouteDemandSource } from './infrastructure/prisma-route-demand.source';
import { PrismaRouteRepository } from './infrastructure/prisma-route.repository';
import { PrismaStopRepository } from './infrastructure/prisma-stop.repository';
import { RoutesController } from './presentation/routes.controller';
import { StopsController } from './presentation/stops.controller';

@Module({
  controllers: [RoutesController, StopsController],
  providers: [
    { provide: ROUTE_REPOSITORY, useClass: PrismaRouteRepository },
    { provide: STOP_REPOSITORY, useClass: PrismaStopRepository },
    { provide: ROUTE_DEMAND_SOURCE, useClass: PrismaRouteDemandSource },
    {
      provide: GetRouteDemand,
      useFactory: (s: RouteDemandSource) => new GetRouteDemand(s),
      inject: [ROUTE_DEMAND_SOURCE],
    },
    {
      provide: SearchRoutes,
      useFactory: (r: RouteRepository) => new SearchRoutes(r),
      inject: [ROUTE_REPOSITORY],
    },
    {
      provide: GetRouteDetails,
      useFactory: (r: RouteRepository) => new GetRouteDetails(r),
      inject: [ROUTE_REPOSITORY],
    },
    {
      provide: FindNearbyStops,
      useFactory: (s: StopRepository) => new FindNearbyStops(s),
      inject: [STOP_REPOSITORY],
    },
    {
      provide: GetStopDetails,
      useFactory: (s: StopRepository) => new GetStopDetails(s),
      inject: [STOP_REPOSITORY],
    },
  ],
  exports: [GetRouteDemand],
})
export class NetworkModule {}
