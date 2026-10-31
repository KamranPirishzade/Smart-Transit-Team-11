import type { EventPublisher } from '../../../common/events/event-publisher';
import type { CrowdReport } from '../domain/crowd-report';
import type { CrowdReportRepository, RouteDemandReader } from './crowding.ports';

/** In-memory test doubles shared by the crowding use case tests. */
export const NOW = new Date('2026-10-31T06:00:00Z');
export const fixedClock = { now: () => NOW };

export const minutesBefore = (date: Date, minutes: number): Date =>
  new Date(date.getTime() - minutes * 60_000);

export class InMemoryReports implements CrowdReportRepository {
  readonly items: CrowdReport[] = [];
  findCalls = 0;

  async save(report: CrowdReport): Promise<void> {
    this.items.push(report);
  }

  async findSince(since: Date, routeId?: number): Promise<CrowdReport[]> {
    this.findCalls += 1;
    return this.items.filter(
      (r) => r.createdAt >= since && (routeId === undefined || r.routeId === routeId),
    );
  }
}

export const demands: RouteDemandReader = {
  demands: async () =>
    new Map<number, number | null>([
      [49, 9000],
      [12, null],
    ]),
};

export class RecordingPublisher implements EventPublisher {
  readonly events: { name: string; payload: unknown }[] = [];
  publish(name: string, payload: unknown): void {
    this.events.push({ name, payload });
  }
}

export function aReport(partial: Partial<CrowdReport> = {}): CrowdReport {
  return {
    id: 'r1',
    routeId: 49,
    direction: 1,
    vehicleId: null,
    stopId: null,
    level: 'CROWDED',
    lat: 40.38,
    lon: 49.85,
    deviceId: 'device-1',
    createdAt: NOW,
    ...partial,
  };
}
