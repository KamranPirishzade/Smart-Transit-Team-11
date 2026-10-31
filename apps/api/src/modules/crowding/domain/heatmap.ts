import { type CrowdLevel, crowdScore, levelFromScore } from '../../../common/domain/crowd-level';
import { reportWeight } from './crowd-aggregator';
import type { CrowdReport } from './crowd-report';

/** ~250 m cells. Baku sits near 40.4°N, so one longitude degree is about 84.9 km. */
export const CELL_SIZE_M = 250;
const M_PER_DEG_LAT = 111_320;
const M_PER_DEG_LON = 84_900;
const LAT_STEP = CELL_SIZE_M / M_PER_DEG_LAT;
const LON_STEP = CELL_SIZE_M / M_PER_DEG_LON;

export interface HeatCell {
  /** Cell centre. */
  lat: number;
  lon: number;
  level: CrowdLevel;
  score: number;
  reportCount: number;
}

/** Groups recent reports into grid cells; every cell shows the time-weighted average level. */
export function buildHeatmap(reports: readonly CrowdReport[], now: Date): HeatCell[] {
  const cells = new Map<string, { row: number; col: number; w: number; s: number; n: number }>();
  for (const report of reports) {
    const weight = reportWeight(now.getTime() - report.createdAt.getTime());
    if (weight <= 0) continue;
    const row = Math.floor(report.lat / LAT_STEP);
    const col = Math.floor(report.lon / LON_STEP);
    const key = `${row}:${col}`;
    const cell = cells.get(key) ?? { row, col, w: 0, s: 0, n: 0 };
    cell.w += weight;
    cell.s += weight * crowdScore(report.level);
    cell.n += 1;
    cells.set(key, cell);
  }
  return [...cells.values()].map((c) => {
    const score = c.s / c.w;
    return {
      lat: (c.row + 0.5) * LAT_STEP,
      lon: (c.col + 0.5) * LON_STEP,
      level: levelFromScore(score),
      score,
      reportCount: c.n,
    };
  });
}
