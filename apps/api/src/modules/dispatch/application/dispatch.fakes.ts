import type { EventPublisher } from '../../../common/events/event-publisher';
import type { ReportSample } from '../domain/congestion-rule';
import type {
  Recommendation,
  RecommendationStatus,
  ReserveDispatch,
} from '../domain/recommendation';
import type {
  CrowdSignals,
  NewRecommendation,
  RecommendationRepository,
  ReportedRouteSample,
} from './dispatch.ports';

export const NOW = new Date('2026-10-31T06:00:00Z');
export const fixedClock = { now: () => NOW };

export class RecordingPublisher implements EventPublisher {
  readonly events: { name: string; payload: unknown }[] = [];
  publish(name: string, payload: unknown): void {
    this.events.push({ name, payload });
  }
  names(): string[] {
    return this.events.map((e) => e.name);
  }
}

export class FakeSignals implements CrowdSignals {
  reports: ReportSample[] = [];
  reported: ReportedRouteSample[] = [];
  async routeReports(): Promise<ReportSample[]> {
    return this.reports;
  }
  async reportedRoutes(): Promise<ReportedRouteSample[]> {
    return this.reported;
  }
}

/** Mimics the DB: one PENDING recommendation per route, atomic accept/dismiss. */
export class InMemoryRecommendations implements RecommendationRepository {
  readonly items: Recommendation[] = [];
  readonly reserves: ReserveDispatch[] = [];
  private seq = 0;

  async createPending(input: NewRecommendation): Promise<Recommendation | null> {
    if (this.items.some((r) => r.routeId === input.routeId && r.status === 'PENDING')) return null;
    const recommendation: Recommendation = {
      ...input,
      id: `rec-${++this.seq}`,
      routeNumber: String(input.routeId),
      status: 'PENDING',
      createdAt: NOW,
      resolvedAt: null,
      resolvedBy: null,
    };
    this.items.push(recommendation);
    return recommendation;
  }

  async hasPending(routeId: number): Promise<boolean> {
    return this.items.some((r) => r.routeId === routeId && r.status === 'PENDING');
  }

  async findById(id: string): Promise<Recommendation | null> {
    return this.items.find((r) => r.id === id) ?? null;
  }

  async list(status: RecommendationStatus | undefined, limit: number): Promise<Recommendation[]> {
    return this.items.filter((r) => !status || r.status === status).slice(0, limit);
  }

  async accept(
    id: string,
    operatorId: string,
    direction: number,
    at: Date,
  ): Promise<ReserveDispatch | null> {
    const rec = this.items.find((r) => r.id === id && r.status === 'PENDING');
    if (!rec) return null;
    Object.assign(rec, { status: 'ACCEPTED', resolvedAt: at, resolvedBy: operatorId });
    const reserve: ReserveDispatch = {
      id: `res-${this.reserves.length + 1}`,
      routeId: rec.routeId,
      direction,
      recommendationId: id,
      active: true,
      createdAt: at,
    };
    this.reserves.push(reserve);
    return reserve;
  }

  async dismiss(id: string, operatorId: string, at: Date): Promise<boolean> {
    const rec = this.items.find((r) => r.id === id && r.status === 'PENDING');
    if (!rec) return false;
    Object.assign(rec, { status: 'DISMISSED', resolvedAt: at, resolvedBy: operatorId });
    return true;
  }

  async countPending(): Promise<number> {
    return this.items.filter((r) => r.status === 'PENDING').length;
  }

  async countActiveReserves(): Promise<number> {
    return this.reserves.filter((r) => r.active).length;
  }
}

export function highReports(count: number, direction: number | null = 1): ReportSample[] {
  return Array.from({ length: count }, () => ({
    level: 'FULL' as const,
    direction,
    createdAt: new Date(NOW.getTime() - 60_000),
  }));
}
