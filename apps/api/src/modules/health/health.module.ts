import { Module } from '@nestjs/common';
import { CheckHealth } from './application/check-health.use-case';
import { DATABASE_HEALTH, type DatabaseHealth } from './application/database-health.port';
import { PrismaDatabaseHealth } from './infrastructure/prisma-database-health';
import { HealthController } from './presentation/health.controller';

@Module({
  controllers: [HealthController],
  providers: [
    { provide: DATABASE_HEALTH, useClass: PrismaDatabaseHealth },
    {
      provide: CheckHealth,
      useFactory: (db: DatabaseHealth) => new CheckHealth(db),
      inject: [DATABASE_HEALTH],
    },
  ],
})
export class HealthModule {}
