import { randomUUID } from 'node:crypto';
import type { CrowdLevel } from '../../../common/domain/crowd-level';
import { NotFoundError } from '../../../common/errors/domain-errors';
import { CROWD_REPORT_SUBMITTED } from '../../../common/events/domain-events';
import type { EventPublisher } from '../../../common/events/event-publisher';
import type { SimClock } from '../../../common/sim-clock/sim-clock';
import type { CrowdReport } from '../domain/crowd-report';
import type { CrowdReportRepository, RouteDemandReader } from './crowding.ports';

export interface SubmitCrowdReportInput {
  routeId: number;
  direction?: number | null;
  vehicleId?: string | null;
  stopId?: number | null;
  level: CrowdLevel;
  lat: number;
  lon: number;
  deviceId: string;
}

export class SubmitCrowdReport {
  constructor(
    private readonly reports: CrowdReportRepository,
    private readonly routes: RouteDemandReader,
    private readonly events: EventPublisher,
    private readonly clock: SimClock,
  ) {}

  async execute(input: SubmitCrowdReportInput): Promise<CrowdReport> {
    const known = await this.routes.demands();
    if (!known.has(input.routeId)) throw new NotFoundError('Route', input.routeId);

    const report: CrowdReport = {
      id: randomUUID(),
      routeId: input.routeId,
      direction: input.direction ?? null,
      vehicleId: input.vehicleId ?? null,
      stopId: input.stopId ?? null,
      level: input.level,
      lat: input.lat,
      lon: input.lon,
      deviceId: input.deviceId,
      createdAt: this.clock.now(),
    };
    await this.reports.save(report);
    this.events.publish(CROWD_REPORT_SUBMITTED, {
      reportId: report.id,
      routeId: report.routeId,
      direction: report.direction,
      level: report.level,
      at: report.createdAt.toISOString(),
    });
    return report;
  }
}
