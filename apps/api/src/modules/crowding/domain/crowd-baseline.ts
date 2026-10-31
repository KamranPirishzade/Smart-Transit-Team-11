import { type CrowdLevel, levelFromScore } from '../../../common/domain/crowd-level';
import { bakuMinutesOfDay } from '../../../common/sim-clock/sim-clock';

/** Ridership at which a route is considered "busy" all day long (about the top of the BakuBus data). */
const BUSY_ROUTE_PASSENGERS = 9000;
const DEFAULT_DEMAND_INDEX = 0.4;
const MIN_DEMAND_INDEX = 0.15;

/** Share of peak crowding by Baku hour (index = hour of day). Peaks around 08:00 and 18:00. */
export const HOUR_PROFILE: readonly number[] = [
  0.05, 0.03, 0.02, 0.02, 0.04, 0.12, 0.3, 0.65, 1, 0.8, 0.55, 0.5, 0.55, 0.55, 0.55, 0.65, 0.85,
  0.95, 1, 0.8, 0.5, 0.3, 0.15, 0.08,
];

export function hourFactor(now: Date): number {
  return HOUR_PROFILE[Math.floor(bakuMinutesOfDay(now) / 60)] ?? 0;
}

/** 0..1 — how busy the route is compared to the busiest ones; unknown demand gets a middle value. */
export function demandIndex(avgDailyPassengers: number | null | undefined): number {
  if (avgDailyPassengers === null || avgDailyPassengers === undefined) return DEFAULT_DEMAND_INDEX;
  return Math.min(1, Math.max(MIN_DEMAND_INDEX, avgDailyPassengers / BUSY_ROUTE_PASSENGERS));
}

/** Baseline crowding score (0..3) = route demand × hour profile. Simulated, not measured. */
export function baselineScore(avgDailyPassengers: number | null | undefined, now: Date): number {
  return 3 * demandIndex(avgDailyPassengers) * hourFactor(now);
}

export function baselineLevel(
  avgDailyPassengers: number | null | undefined,
  now: Date,
): CrowdLevel {
  return levelFromScore(baselineScore(avgDailyPassengers, now));
}
