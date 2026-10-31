import { ApiProperty } from '@nestjs/swagger';
import type { HealthReport } from '../application/check-health.use-case';

export class HealthResponseDto implements HealthReport {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  db!: 'up' | 'down';

  @ApiProperty({ example: 120, description: 'Process uptime in seconds' })
  uptimeS!: number;
}
