import type { DatabaseHealth } from './database-health.port';

export interface HealthReport {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  uptimeS: number;
}

export class CheckHealth {
  constructor(
    private readonly database: DatabaseHealth,
    private readonly uptimeS: () => number = () => Math.round(process.uptime()),
  ) {}

  async execute(): Promise<HealthReport> {
    const db = await this.database.ping().then(
      () => 'up' as const,
      () => 'down' as const,
    );
    return { status: db === 'up' ? 'ok' : 'degraded', db, uptimeS: this.uptimeS() };
  }
}
