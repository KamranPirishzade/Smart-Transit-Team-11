import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CROWD_REPORT_SUBMITTED,
  type CrowdReportSubmitted,
} from '../../../common/events/domain-events';
import { EvaluateCongestion } from '../application/evaluate-congestion';

/** Reacts to every new passenger report: the congestion rule may now fire for that route. */
@Injectable()
export class CongestionListener {
  private readonly logger = new Logger(CongestionListener.name);

  constructor(private readonly evaluateCongestion: EvaluateCongestion) {}

  @OnEvent(CROWD_REPORT_SUBMITTED)
  async onReportSubmitted(event: CrowdReportSubmitted): Promise<void> {
    try {
      const created = await this.evaluateCongestion.execute(event.routeId);
      if (created)
        this.logger.log(`recommendation ${created.id} created for route ${event.routeId}`);
    } catch (error) {
      this.logger.warn(`congestion check failed for route ${event.routeId}: ${String(error)}`);
    }
  }
}
