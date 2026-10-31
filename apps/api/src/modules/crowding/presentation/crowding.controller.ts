import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { GetCrowdHeatmap, GetReportedRoutes } from '../application/crowd-queries';
import { SubmitCrowdReport } from '../application/submit-crowd-report';
import { CELL_SIZE_M } from '../domain/heatmap';
import {
  HeatmapDto,
  ReportAcceptedDto,
  RouteCrowdDto,
  RouteCrowdQueryDto,
  SubmitReportDto,
} from './crowding.dto';
import { DeviceThrottlerGuard, REPORT_RATE_LIMIT } from './device-throttler.guard';

@ApiTags('crowding')
@Controller()
export class CrowdingController {
  constructor(
    private readonly submitReport: SubmitCrowdReport,
    private readonly reportedRoutes: GetReportedRoutes,
    private readonly heatmap: GetCrowdHeatmap,
  ) {}

  @Post('reports')
  @HttpCode(201)
  @UseGuards(DeviceThrottlerGuard)
  @Throttle({ default: REPORT_RATE_LIMIT })
  @ApiOperation({
    summary: 'Report how crowded a bus is',
    description: 'Rate limit: 3 reports per minute per deviceId.',
  })
  @ApiCreatedResponse({ type: ReportAcceptedDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto, description: 'Unknown route' })
  @ApiTooManyRequestsResponse({ type: ErrorResponseDto })
  async report(@Body() dto: SubmitReportDto): Promise<ReportAcceptedDto> {
    const report = await this.submitReport.execute(dto);
    return {
      id: report.id,
      routeId: report.routeId,
      level: report.level,
      createdAt: report.createdAt.toISOString(),
    };
  }

  @Get('crowding/heatmap')
  @ApiOperation({
    summary: 'Crowding heatmap (~250 m cells) from reports of the last 10 minutes',
  })
  @ApiOkResponse({ type: HeatmapDto })
  async getHeatmap(): Promise<HeatmapDto> {
    return { cellSizeM: CELL_SIZE_M, cells: await this.heatmap.execute() };
  }

  @Get('crowding/routes')
  @ApiOperation({ summary: 'Routes with passenger reports right now, most crowded first' })
  @ApiOkResponse({ type: [RouteCrowdDto] })
  async routes(@Query() query: RouteCrowdQueryDto): Promise<RouteCrowdDto[]> {
    return (await this.reportedRoutes.execute()).slice(0, query.limit ?? 50);
  }
}
