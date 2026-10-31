import { type CrowdLevel, crowdScore, levelFromScore } from '../../../common/domain/crowd-level';
import { baselineScore } from './crowd-baseline';
import { type CrowdReport, REPORT_HALF_LIFE_MS, REPORT_WINDOW_MS } from './crowd-report';

export type CrowdSource = 'reports' | 'baseline';

export interface RouteCrowd {
  level: CrowdLevel;
  /** 0..3, before rounding. */
  score: number;
  source: CrowdSource;
  /** Reports inside the 10-minute window. */
  reportCount: number;
}

/** Weight of a report of the given age: 1 when fresh, 0.5 after the half-life, 0 outside the window. */
export function reportWeight(ageMs: number): number {
  if (ageMs < 0 || ageMs > REPORT_WINDOW_MS) return 0;
  return Math.pow(0.5, ageMs / REPORT_HALF_LIFE_MS);
}

/**
 * Current crowding of one route. Reports from the last 10 minutes override the baseline: their score is
 * a time-weighted average (half-life 5 minutes). Without reports the simulated baseline is used.
 */
export function aggregateRouteCrowd(
  reports: readonly Pick<CrowdReport, 'level' | 'createdAt'>[],
  avgDailyPassengers: number | null | undefined,
  now: Date,
): RouteCrowd {
  let weightSum = 0;
  let weighted = 0;
  let count = 0;
  for (const report of reports) {
    const weight = reportWeight(now.getTime() - report.createdAt.getTime());
    if (weight <= 0) continue;
    weightSum += weight;
    weighted += weight * crowdScore(report.level);
    count += 1;
  }
  if (count === 0) {
    const score = baselineScore(avgDailyPassengers, now);
    return { level: levelFromScore(score), score, source: 'baseline', reportCount: 0 };
  }
  const score = weighted / weightSum;
  return { level: levelFromScore(score), score, source: 'reports', reportCount: count };
}
