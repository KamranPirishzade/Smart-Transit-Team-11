import type { CrowdLevel } from '../../../common/domain/crowd-level';

export interface CrowdReport {
  id: string;
  routeId: number;
  direction: number | null;
  vehicleId: string | null;
  stopId: number | null;
  level: CrowdLevel;
  lat: number;
  lon: number;
  deviceId: string;
  createdAt: Date;
}

/** Only recent reports count: everything older than this is ignored. */
export const REPORT_WINDOW_MS = 10 * 60_000;
export const REPORT_HALF_LIFE_MS = 5 * 60_000;
