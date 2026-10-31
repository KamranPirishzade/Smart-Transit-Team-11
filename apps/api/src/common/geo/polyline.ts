import type { LonLat } from './geo.types';
import { EARTH_RADIUS_M, haversineM } from './haversine';

/** Cumulative distance (m) from the first vertex to each vertex. */
export function cumulativeDistances(line: readonly LonLat[]): number[] {
  const out: number[] = [];
  let total = 0;
  line.forEach((point, i) => {
    const prev = line[i - 1];
    if (prev) total += haversineM(prev, point);
    out.push(total);
  });
  return out;
}

export function lineLengthM(line: readonly LonLat[]): number {
  return cumulativeDistances(line).at(-1) ?? 0;
}

export interface SegmentProjection {
  /** Index of the segment start vertex. */
  segmentIndex: number;
  /** Distance along the line (m) of the projected point. */
  distanceAlongM: number;
  /** Perpendicular offset (m) from the point to the line. */
  offsetM: number;
}

/**
 * Projects `point` onto segment [a, b] using a local equirectangular approximation
 * (accurate to centimetres at city scale). Returns the fraction t ∈ [0, 1] and the offset in metres.
 */
export function projectOntoSegment(
  point: LonLat,
  a: LonLat,
  b: LonLat,
): { t: number; offsetM: number } {
  const kx = Math.cos((a[1] * Math.PI) / 180) * ((Math.PI / 180) * EARTH_RADIUS_M);
  const ky = (Math.PI / 180) * EARTH_RADIUS_M;
  const bx = (b[0] - a[0]) * kx;
  const by = (b[1] - a[1]) * ky;
  const px = (point[0] - a[0]) * kx;
  const py = (point[1] - a[1]) * ky;
  const len2 = bx * bx + by * by;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, (px * bx + py * by) / len2));
  return { t, offsetM: Math.hypot(px - t * bx, py - t * by) };
}

/** Projects every segment from `fromSegment` onwards and returns all candidates. */
export function projectOntoLine(
  line: readonly LonLat[],
  cumulative: readonly number[],
  point: LonLat,
  fromSegment = 0,
): SegmentProjection[] {
  const candidates: SegmentProjection[] = [];
  for (let i = Math.max(0, fromSegment); i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const { t, offsetM } = projectOntoSegment(point, a, b);
    const start = cumulative[i]!;
    const segLen = cumulative[i + 1]! - start;
    candidates.push({ segmentIndex: i, distanceAlongM: start + t * segLen, offsetM });
  }
  return candidates;
}

/** Point located `distanceM` metres along the line (clamped to its ends). */
export function pointAtDistance(
  line: readonly LonLat[],
  cumulative: readonly number[],
  distanceM: number,
): LonLat {
  const first = line[0];
  const last = line.at(-1);
  if (!first || !last) throw new Error('pointAtDistance: empty line');
  if (distanceM <= 0) return first;
  const total = cumulative.at(-1) ?? 0;
  if (distanceM >= total) return last;
  let lo = 0;
  let hi = cumulative.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cumulative[mid]! <= distanceM) lo = mid;
    else hi = mid;
  }
  const a = line[lo]!;
  const b = line[hi]!;
  const segLen = cumulative[hi]! - cumulative[lo]!;
  const t = segLen === 0 ? 0 : (distanceM - cumulative[lo]!) / segLen;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Initial bearing from a to b in degrees, 0 = north, clockwise. */
export function bearingDeg(a: LonLat, b: LonLat): number {
  const toRad = Math.PI / 180;
  const y = Math.sin((b[0] - a[0]) * toRad) * Math.cos(b[1] * toRad);
  const x =
    Math.cos(a[1] * toRad) * Math.sin(b[1] * toRad) -
    Math.sin(a[1] * toRad) * Math.cos(b[1] * toRad) * Math.cos((b[0] - a[0]) * toRad);
  return (((Math.atan2(y, x) / toRad) % 360) + 360) % 360;
}

/** Direction of travel (degrees) of the segment that contains `distanceM`. */
export function bearingAtDistance(
  line: readonly LonLat[],
  cumulative: readonly number[],
  distanceM: number,
): number {
  if (line.length < 2) return 0;
  let i = 0;
  while (i < cumulative.length - 2 && cumulative[i + 1]! <= distanceM) i++;
  return bearingDeg(line[i]!, line[i + 1]!);
}
