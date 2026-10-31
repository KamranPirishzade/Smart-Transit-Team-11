import { type CrowdLevel, isHighCrowd } from '../../../common/domain/crowd-level';

/** Look at the last 10 minutes of reports of one route. */
export const CONGESTION_WINDOW_MS = 10 * 60_000;
/** At least this many CROWDED + FULL reports ... */
export const MIN_HIGH_REPORTS = 8;
/** ... that make up at least this share of all reports in the window ... */
export const MIN_HIGH_SHARE = 0.6;
/** ... and there must be no PENDING recommendation for the route yet. */

export interface ReportSample {
  level: CrowdLevel;
  direction: number | null;
  createdAt: Date;
}

export interface CongestionVerdict {
  triggered: boolean;
  highReports: number;
  totalReports: number;
  /** Share of high reports, 0..1 (0 when there are no reports). */
  highShare: number;
  /** Direction with most high reports, null when the reports do not say. */
  direction: number | null;
  windowStart: Date;
  windowEnd: Date;
}

function dominantDirection(highReports: readonly ReportSample[]): number | null {
  const counts = new Map<number, number>();
  for (const report of highReports) {
    if (report.direction === null) continue;
    counts.set(report.direction, (counts.get(report.direction) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const [direction, count] of [...counts].sort((a, b) => a[0] - b[0])) {
    if (count > bestCount) {
      best = direction;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Congestion rule for one route: ≥ 8 CROWDED/FULL reports AND ≥ 60% of all reports in the last 10 min
 * AND no PENDING recommendation for the route.
 */
export function evaluateCongestion(input: {
  reports: readonly ReportSample[];
  now: Date;
  hasPendingRecommendation: boolean;
}): CongestionVerdict {
  const windowEnd = input.now;
  const windowStart = new Date(windowEnd.getTime() - CONGESTION_WINDOW_MS);
  const inWindow = input.reports.filter(
    (r) => r.createdAt >= windowStart && r.createdAt <= windowEnd,
  );
  const high = inWindow.filter((r) => isHighCrowd(r.level));
  const highShare = inWindow.length === 0 ? 0 : high.length / inWindow.length;
  const triggered =
    high.length >= MIN_HIGH_REPORTS &&
    highShare >= MIN_HIGH_SHARE &&
    !input.hasPendingRecommendation;
  return {
    triggered,
    highReports: high.length,
    totalReports: inWindow.length,
    highShare,
    direction: dominantDirection(high),
    windowStart,
    windowEnd,
  };
}

/** Operator-facing reason (the operator UI is in Azerbaijani). */
export function describeCongestion(verdict: CongestionVerdict): string {
  const percent = Math.round(verdict.highShare * 100);
  return `Son 10 dəqiqədə ${verdict.totalReports} bildirişdən ${verdict.highReports}-i (${percent}%) "sıx" və ya "dolu" səviyyəsindədir`;
}
