import { Controller, Get, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { GetVehicles } from '../application/get-vehicles';
import { toVehicleFilter, VehiclesQueryDto, VehiclesSnapshotDto } from './simulation.dto';

@ApiTags('simulation')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly getVehicles: GetVehicles) {}

  @Get()
  @ApiOperation({
    summary: 'Current (simulated) bus positions',
    description:
      'Filter by `routeId` or by visible `bbox` (max 800 vehicles). Live updates: GET /stream/vehicles.',
  })
  @ApiOkResponse({ type: VehiclesSnapshotDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto })
  list(@Query() query: VehiclesQueryDto): Promise<VehiclesSnapshotDto> {
    return this.getVehicles.execute(toVehicleFilter(query), query.limit);
  }
}
