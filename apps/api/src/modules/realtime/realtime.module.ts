import { Module } from '@nestjs/common';
import { SimulationModule } from '../simulation/public-api';
import { StreamController } from './presentation/stream.controller';

/** Server → browser delivery (SSE). Owns no business logic; reads through other modules' public APIs. */
@Module({
  imports: [SimulationModule],
  controllers: [StreamController],
})
export class RealtimeModule {}
