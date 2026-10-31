import type { LonLat } from './geo.types';
import { EARTH_RADIUS_M } from './haversine';

export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/** Parses "minLon,minLat,maxLon,maxLat". Returns null for malformed or inverted boxes. */
export function parseBbox(raw: string): BBox | null {
  const parts = raw.split(',').map((p) => Number(p.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if (minLon >= maxLon || minLat >= maxLat) return null;
  if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) return null;
  return { minLon, minLat, maxLon, maxLat };
}

export function bboxContains(box: BBox, [lon, lat]: LonLat): boolean {
  return lon >= box.minLon && lon <= box.maxLon && lat >= box.minLat && lat <= box.maxLat;
}

/** Smallest lon/lat box containing a circle of `radiusM` around `center` (pre-filter for DB queries). */
export function bboxAround([lon, lat]: LonLat, radiusM: number): BBox {
  const dLat = (radiusM / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon = dLat / Math.max(Math.cos((lat * Math.PI) / 180), 1e-6);
  return { minLon: lon - dLon, minLat: lat - dLat, maxLon: lon + dLon, maxLat: lat + dLat };
}
