import type { LonLat } from '../../src/common/geo/geo.types';
import { haversineM } from '../../src/common/geo/haversine';
import { cumulativeDistances, projectOntoLine } from '../../src/common/geo/polyline';

/** A later segment is only preferred if it is closer than the earliest good match by more than this. */
const EARLIEST_MATCH_TOLERANCE_M = 25;

export interface StopProjection {
  /** Distance along the line (m). */
  distanceM: number;
  /** How far the stop is from the line (m) — used to judge whether a line fits its stops. */
  offsetM: number;
}

/**
 * Distance along `line` for each stop, in stop order. Monotonic by construction: each stop is searched
 * from the previous stop's segment onwards, and among near-equal candidates the earliest wins, so loop
 * routes (start ≈ end) do not jump to the far end of the line.
 */
export function projectStopsOntoLine(
  line: readonly LonLat[],
  stops: readonly LonLat[],
): StopProjection[] {
  if (line.length < 2) throw new Error('projectStopsOntoLine: line needs at least 2 points');
  const cumulative = cumulativeDistances(line);
  const projections: StopProjection[] = [];
  let fromSegment = 0;
  let previous = 0;
  for (const stop of stops) {
    const candidates = projectOntoLine(line, cumulative, stop, fromSegment);
    const bestOffset = Math.min(...candidates.map((c) => c.offsetM));
    const chosen = candidates.find((c) => c.offsetM <= bestOffset + EARLIEST_MATCH_TOLERANCE_M)!;
    const distanceM = Math.max(previous, chosen.distanceAlongM);
    projections.push({ distanceM, offsetM: chosen.offsetM });
    previous = distanceM;
    fromSegment = chosen.segmentIndex;
  }
  return projections;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Rough Baku agglomeration bounds (Absheron incl. Sumqayit) used to reject broken coordinates. */
const REGION = { minLon: 49.0, maxLon: 50.6, minLat: 39.9, maxLat: 41.0 };

export function isInRegion(lon: unknown, lat: unknown): lon is number {
  return (
    typeof lon === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= REGION.minLon &&
    lon <= REGION.maxLon &&
    lat >= REGION.minLat &&
    lat <= REGION.maxLat
  );
}

/**
 * Repairs a source polyline: swaps lat/lon when the whole line was written as [lat, lon], drops
 * vertices outside the region and consecutive duplicates. Returns null if fewer than 2 vertices remain.
 */
export function normalizeLine(raw: readonly LonLat[]): { line: LonLat[]; swapped: boolean } | null {
  const swapped = raw.length > 0 && raw.every(([a, b]) => isInRegion(b, a) && !isInRegion(a, b));
  const line: LonLat[] = [];
  for (const [a, b] of raw) {
    const point: LonLat = swapped ? [b, a] : [a, b];
    const prev = line.at(-1);
    if (!isInRegion(point[0], point[1])) continue;
    if (prev && prev[0] === point[0] && prev[1] === point[1]) continue;
    line.push(point);
  }
  return line.length >= 2 ? { line, swapped } : null;
}

/**
 * Orients a line so it starts near the first stop. `endGapM` (sum of both end gaps) scores how well
 * the line fits the stop sequence and is used to choose among duplicate features.
 */
export function orientLine(
  line: readonly LonLat[],
  firstStop: LonLat,
  lastStop: LonLat,
): { line: LonLat[]; endGapM: number } {
  const start = line[0]!;
  const end = line.at(-1)!;
  const forwardGap = haversineM(start, firstStop) + haversineM(end, lastStop);
  const reverseGap = haversineM(end, firstStop) + haversineM(start, lastStop);
  return forwardGap <= reverseGap
    ? { line: [...line], endGapM: forwardGap }
    : { line: [...line].reverse(), endGapM: reverseGap };
}
