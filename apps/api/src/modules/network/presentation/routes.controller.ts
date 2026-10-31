import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { GetRouteDetails, SearchRoutes } from '../application/route-queries';
import { RouteDetailsDto, RouteSummaryDto, SearchRoutesQueryDto } from './network.dto';

@ApiTags('network')
@Controller('routes')
export class RoutesController {
  constructor(
    private readonly searchRoutes: SearchRoutes,
    private readonly getRouteDetails: GetRouteDetails,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Search routes',
    description:
      'Number prefix or terminus name. Routes without stops are returned last with `hasStops: false`.',
  })
  @ApiOkResponse({ type: [RouteSummaryDto] })
  search(@Query() q: SearchRoutesQueryDto): Promise<RouteSummaryDto[]> {
    return this.searchRoutes.execute(q.query, q.limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Route with directions, stops and line geometry' })
  @ApiOkResponse({ type: RouteDetailsDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  details(@Param('id', ParseIntPipe) id: number): Promise<RouteDetailsDto> {
    return this.getRouteDetails.execute(id);
  }
}
