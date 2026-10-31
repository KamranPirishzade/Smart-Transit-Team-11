import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { FindNearbyStops, GetStopDetails } from '../application/stop-queries';
import { NearbyStopDto, NearbyStopsQueryDto, StopDetailsDto } from './network.dto';

@ApiTags('network')
@Controller('stops')
export class StopsController {
  constructor(
    private readonly findNearbyStops: FindNearbyStops,
    private readonly getStopDetails: GetStopDetails,
  ) {}

  @Get('nearby')
  @ApiOperation({ summary: 'Stops within a radius, nearest first' })
  @ApiOkResponse({ type: [NearbyStopDto] })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  nearby(@Query() q: NearbyStopsQueryDto): Promise<NearbyStopDto[]> {
    return this.findNearbyStops.execute({
      lat: q.lat,
      lon: q.lon,
      radiusM: q.radius,
      limit: q.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Stop with the routes that serve it' })
  @ApiOkResponse({ type: StopDetailsDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  details(@Param('id', ParseIntPipe) id: number): Promise<StopDetailsDto> {
    return this.getStopDetails.execute(id);
  }
}
