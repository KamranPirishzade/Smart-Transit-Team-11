import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/public-api';
import { DispatchModule } from '../dispatch/public-api';
import { SimulationModule } from '../simulation/public-api';
import { OperatorStreamController } from './presentation/operator-stream.controller';
import { StreamController } from './presentation/stream.controller';

/** Server → browser delivery (SSE). Owns no business logic; reads through other modules' public APIs. */
@Module({
  imports: [SimulationModule, AuthModule, DispatchModule],
  controllers: [StreamController, OperatorStreamController],
})
export class RealtimeModule {}
