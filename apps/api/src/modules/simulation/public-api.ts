/** The only file other modules may import from the simulation module. */
export { SimulationModule } from './simulation.module';
export { GetVehicles, type VehicleFilter, type VehiclesSnapshot } from './application/get-vehicles';
export {
  toVehicleFilter,
  VehiclesQueryDto,
  VehiclesSnapshotDto,
} from './presentation/simulation.dto';
