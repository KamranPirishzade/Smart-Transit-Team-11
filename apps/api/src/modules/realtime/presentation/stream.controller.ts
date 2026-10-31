import { Controller, Logger, type MessageEvent, Query, Sse } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import {
  GetVehicles,
  toVehicleFilter,
  VehiclesQueryDto,
  VehiclesSnapshotDto,
} from '../../simulation/public-api';
import { periodicStream } from '../application/periodic-stream';

export const VEHICLE_STREAM_PERIOD_MS = 2000;

@ApiTags('realtime')
@Controller('stream')
export class StreamController {
  private readonly logger = new Logger(StreamController.name);

  constructor(private readonly getVehicles: GetVehicles) {}

  @Sse('vehicles')
  @ApiOperation({
    summary: 'Live bus positions (Server-Sent Events, every 2 s)',
    description:
      'Same filter as GET /vehicles (`routeId` or `bbox`). Each `vehicles` event carries a VehiclesSnapshot; clients interpolate between ticks.',
  })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ type: VehiclesSnapshotDto, description: 'data of each `vehicles` event' })
  vehicles(@Query() query: VehiclesQueryDto): Observable<MessageEvent> {
    const filter = toVehicleFilter(query);
    return periodicStream(
      'vehicles',
      () => this.getVehicles.execute(filter, query.limit),
      VEHICLE_STREAM_PERIOD_MS,
      (error) => this.logger.warn(`vehicle tick failed: ${String(error)}`),
    );
  }
}
