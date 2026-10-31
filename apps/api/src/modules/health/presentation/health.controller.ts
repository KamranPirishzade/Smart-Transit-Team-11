import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CheckHealth } from '../application/check-health.use-case';
import { HealthResponseDto } from './health-response.dto';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly checkHealth: CheckHealth) {}

  @Get()
  @ApiOperation({ summary: 'Liveness + database connectivity' })
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ type: HealthResponseDto, description: 'Database unreachable' })
  async get(@Res({ passthrough: true }) res: Response): Promise<HealthResponseDto> {
    const report = await this.checkHealth.execute();
    res.status(report.db === 'up' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return report;
  }
}
