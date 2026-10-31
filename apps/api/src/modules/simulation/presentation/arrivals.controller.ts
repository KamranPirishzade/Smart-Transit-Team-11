import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { GetStopArrivals } from '../application/get-stop-arrivals';
import { ArrivalsQueryDto, StopArrivalsDto } from './simulation.dto';

@ApiTags('simulation')
@Controller('stops')
export class ArrivalsController {
  constructor(private readonly getStopArrivals: GetStopArrivals) {}

  @Get(':id/arrivals')
  @ApiOperation({ summary: 'ETA list for a stop, soonest first (simulated)' })
  @ApiOkResponse({ type: StopArrivalsDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Unknown stop or no route serves it',
  })
  arrivals(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ArrivalsQueryDto,
  ): Promise<StopArrivalsDto> {
    return this.getStopArrivals.execute(id, query.limit);
  }
}
