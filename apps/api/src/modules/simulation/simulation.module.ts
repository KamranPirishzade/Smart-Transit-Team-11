import { Logger, Module, type OnApplicationBootstrap } from '@nestjs/common';
import { SIM_CLOCK, type SimClock } from '../../common/sim-clock/sim-clock';
import { GetStopArrivals } from './application/get-stop-arrivals';
import { GetVehicles } from './application/get-vehicles';
import { SimulationNetwork } from './application/simulation-network';
import {
  RESERVE_VEHICLE_SOURCE,
  ROUTE_CROWD_READER,
  ROUTE_NETWORK_SOURCE,
  SIMULATION_CONFIG,
  type ReserveVehicleSource,
  type RouteCrowdReader,
  type RouteNetworkSource,
} from './application/simulation.ports';
import { DEFAULT_SIMULATION_CONFIG, type SimulationConfig } from './domain/simulation.config';
import { CrowdingRouteCrowdReader } from './infrastructure/crowding-route-crowd.reader';
import { PrismaReserveVehicleSource } from './infrastructure/prisma-reserve-vehicle.source';
import { PrismaRouteNetworkSource } from './infrastructure/prisma-route-network.source';
import { CrowdingModule } from '../crowding/public-api';
import { ArrivalsController } from './presentation/arrivals.controller';
import { ReserveEventsListener } from './presentation/reserve-events.listener';
import { VehiclesController } from './presentation/vehicles.controller';

const USE_CASE_DEPS = [
  SimulationNetwork,
  RESERVE_VEHICLE_SOURCE,
  ROUTE_CROWD_READER,
  SIM_CLOCK,
  SIMULATION_CONFIG,
];
type UseCaseDeps = [
  SimulationNetwork,
  ReserveVehicleSource,
  RouteCrowdReader,
  SimClock,
  SimulationConfig,
];

@Module({
  imports: [CrowdingModule],
  controllers: [VehiclesController, ArrivalsController],
  providers: [
    { provide: SIMULATION_CONFIG, useValue: DEFAULT_SIMULATION_CONFIG },
    { provide: ROUTE_NETWORK_SOURCE, useClass: PrismaRouteNetworkSource },
    PrismaReserveVehicleSource,
    ReserveEventsListener,
    { provide: RESERVE_VEHICLE_SOURCE, useExisting: PrismaReserveVehicleSource },
    { provide: ROUTE_CROWD_READER, useClass: CrowdingRouteCrowdReader },
    {
      provide: SimulationNetwork,
      useFactory: (source: RouteNetworkSource) => new SimulationNetwork(source),
      inject: [ROUTE_NETWORK_SOURCE],
    },
    {
      provide: GetVehicles,
      useFactory: (...deps: UseCaseDeps) => new GetVehicles(...deps),
      inject: USE_CASE_DEPS,
    },
    {
      provide: GetStopArrivals,
      useFactory: (...deps: UseCaseDeps) => new GetStopArrivals(...deps),
      inject: USE_CASE_DEPS,
    },
  ],
  exports: [GetVehicles],
})
export class SimulationModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(SimulationModule.name);

  constructor(private readonly network: SimulationNetwork) {}

  /** Warm the network cache in the background so the first passenger request is fast. */
  onApplicationBootstrap(): void {
    const started = Date.now();
    this.network.get().then(
      (index) =>
        this.logger.log(
          `network loaded: ${index.directions.length} directions in ${Date.now() - started} ms`,
        ),
      (error: unknown) =>
        this.logger.warn(`network warm-up failed, will retry on demand: ${String(error)}`),
    );
  }
}
