import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { reserveVehicleId } from '../../simulation/public-api';
import {
  CurrentOperator,
  OperatorAuthGuard,
  type AuthenticatedOperator,
} from '../../auth/public-api';
import { GetOperatorOverview, SetSimClock } from '../application/operator-overview';
import {
  AcceptRecommendation,
  DismissRecommendation,
  ListActiveReserves,
  ListRecommendations,
} from '../application/recommendation-use-cases';
import type { Recommendation } from '../domain/recommendation';
import {
  ActiveReserveDto,
  OperatorOverviewDto,
  RecommendationDto,
  RecommendationsQueryDto,
  ReserveDispatchDto,
  SetSimClockDto,
  SimClockStateDto,
} from './operator.dto';

function toDto(r: Recommendation): RecommendationDto {
  return {
    id: r.id,
    routeId: r.routeId,
    routeNumber: r.routeNumber,
    direction: r.direction,
    reason: r.reason,
    highReports: r.highReports,
    totalReports: r.totalReports,
    windowStart: r.windowStart.toISOString(),
    windowEnd: r.windowEnd.toISOString(),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  };
}

@ApiTags('operator')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ type: ErrorResponseDto })
@UseGuards(OperatorAuthGuard)
@Controller('operator')
export class OperatorController {
  constructor(
    private readonly overview: GetOperatorOverview,
    private readonly listRecommendations: ListRecommendations,
    private readonly acceptRecommendation: AcceptRecommendation,
    private readonly dismissRecommendation: DismissRecommendation,
    private readonly setSimClock: SetSimClock,
    private readonly listActiveReserves: ListActiveReserves,
  ) {}

  @Get('reserves')
  @ApiOperation({ summary: 'Active reserve buses, newest first' })
  @ApiOkResponse({ type: [ActiveReserveDto] })
  async reserves(): Promise<ActiveReserveDto[]> {
    return (await this.listActiveReserves.execute()).map((r) => ({
      id: r.id,
      routeId: r.routeId,
      routeNumber: r.routeNumber,
      direction: r.direction,
      createdAt: r.createdAt.toISOString(),
      vehicleId: reserveVehicleId(r.id),
    }));
  }

  @Get('overview')
  @ApiOperation({ summary: 'Operator dashboard numbers' })
  @ApiOkResponse({ type: OperatorOverviewDto })
  getOverview(): Promise<OperatorOverviewDto> {
    return this.overview.execute();
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Reserve-bus recommendations, newest first' })
  @ApiOkResponse({ type: [RecommendationDto] })
  async recommendations(@Query() query: RecommendationsQueryDto): Promise<RecommendationDto[]> {
    return (await this.listRecommendations.execute(query.status, query.limit)).map(toDto);
  }

  @Post('recommendations/:id/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept: dispatches a reserve bus on the route' })
  @ApiOkResponse({ type: ReserveDispatchDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Already accepted or dismissed' })
  async accept(
    @Param('id') id: string,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<ReserveDispatchDto> {
    const reserve = await this.acceptRecommendation.execute(id, operator.id);
    return {
      id: reserve.id,
      routeId: reserve.routeId,
      direction: reserve.direction,
      recommendationId: reserve.recommendationId,
      vehicleId: reserveVehicleId(reserve.id),
    };
  }

  @Post('recommendations/:id/dismiss')
  @HttpCode(204)
  @ApiOperation({ summary: 'Dismiss a recommendation' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Already accepted or dismissed' })
  async dismiss(
    @Param('id') id: string,
    @CurrentOperator() operator: AuthenticatedOperator,
  ): Promise<void> {
    await this.dismissRecommendation.execute(id, operator.id);
  }

  @Put('sim-clock')
  @ApiOperation({
    summary: 'Set the simulation demo time',
    description: 'Shifts "now" for positions, ETAs, crowding and the rules. `null` = real time.',
  })
  @ApiOkResponse({ type: SimClockStateDto })
  setClock(@Body() dto: SetSimClockDto): SimClockStateDto {
    return this.setSimClock.execute(dto.time);
  }
}
