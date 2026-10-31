import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppConfigModule } from './common/config/app-config.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaModule } from './common/prisma/prisma.module';
import { SimClockModule } from './common/sim-clock/sim-clock.module';
import { HealthModule } from './modules/health/health.module';
import { NetworkModule } from './modules/network/network.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { SimulationModule } from './modules/simulation/simulation.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    SimClockModule,
    HealthModule,
    NetworkModule,
    SimulationModule,
    RealtimeModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
