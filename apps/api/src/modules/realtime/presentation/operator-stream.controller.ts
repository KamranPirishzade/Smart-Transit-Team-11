import { Controller, Logger, type MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { merge, type Observable } from 'rxjs';
import {
  DISPATCH_RECOMMENDATION_CREATED,
  DISPATCH_RECOMMENDATION_RESOLVED,
  DISPATCH_RESERVE_ADDED,
} from '../../../common/events/domain-events';
import { domainEventStream } from '../../../common/events/event-stream';
import { ErrorResponseDto } from '../../../common/http/error-response.dto';
import { OperatorAuthGuard } from '../../auth/public-api';
import { GetOperatorOverview, OperatorOverviewDto } from '../../dispatch/public-api';
import { periodicStream } from '../application/periodic-stream';

export const OPERATOR_STREAM_PERIOD_MS = 2000;

@ApiTags('realtime')
@Controller('stream')
export class OperatorStreamController {
  private readonly logger = new Logger(OperatorStreamController.name);

  constructor(
    private readonly getOverview: GetOperatorOverview,
    private readonly events: EventEmitter2,
  ) {}

  @Sse('operator')
  @UseGuards(OperatorAuthGuard)
  @ApiBearerAuth()
  @ApiQuery({ name: 'token', required: false, description: 'JWT (EventSource cannot set headers)' })
  @ApiOperation({
    summary: 'Operator live stream (SSE)',
    description:
      '`overview` every 2 s, plus `dispatch.recommendation.created`, `dispatch.recommendation.resolved` and `dispatch.reserve.added` the moment they happen.',
  })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({ type: OperatorOverviewDto, description: 'data of each `overview` event' })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto })
  operator(): Observable<MessageEvent> {
    return merge(
      periodicStream(
        'overview',
        () => this.getOverview.execute(),
        OPERATOR_STREAM_PERIOD_MS,
        (error) => this.logger.warn(`operator tick failed: ${String(error)}`),
      ),
      domainEventStream(this.events, [
        DISPATCH_RECOMMENDATION_CREATED,
        DISPATCH_RECOMMENDATION_RESOLVED,
        DISPATCH_RESERVE_ADDED,
      ]),
    );
  }
}
