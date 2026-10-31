import type { SimulationConfig } from './simulation.config';

/** Static facts about one direction of a route (from the network). */
export interface DirectionProfile {
  routeId: number;
  direction: number;
  lengthM: number;
  /** One-way scheduled duration from the source (minutes). */
  durationMin: number;
  /** BakuBus average daily trips for the whole route; null when not in the dataset. */
  avgDailyPassengers: number | null;
}

/** Service parameters of a direction at a given time of day. */
export interface DirectionService {
  routeId: number;
  direction: number;
  lengthM: number;
  headwayS: number;
  speedMps: number;
  /** Deterministic schedule offset (0 ≤ phase < headway), so routes do not all depart together. */
  phaseS: number;
}

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export function isPeak(minutesOfDay: number, config: SimulationConfig): boolean {
  return config.peakWindows.some(([start, end]) => minutesOfDay >= start && minutesOfDay < end);
}

/** Off-peak headway from demand: runs per direction spread over the service day. */
export function baseHeadwayMin(
  avgDailyPassengers: number | null,
  config: SimulationConfig,
): number {
  if (!avgDailyPassengers || avgDailyPassengers <= 0) return config.defaultHeadwayMin;
  const runsPerDirection = avgDailyPassengers / config.passengersPerRun / 2;
  const headway = (config.serviceHours * 60) / runsPerDirection;
  return clamp(headway, config.minHeadwayMin, config.maxHeadwayMin);
}

export function baseSpeedKmh(
  lengthM: number,
  durationMin: number,
  config: SimulationConfig,
): number {
  if (!(durationMin > 0) || !(lengthM > 0)) return config.defaultSpeedKmh;
  return clamp(lengthM / 1000 / (durationMin / 60), config.minSpeedKmh, config.maxSpeedKmh);
}

/** FNV-1a 32-bit — stable across processes and restarts. */
export function stableHash(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

export function serviceAt(
  profile: DirectionProfile,
  minutesOfDay: number,
  config: SimulationConfig,
): DirectionService {
  const peak = isPeak(minutesOfDay, config);
  const headwayS = Math.round(
    baseHeadwayMin(profile.avgDailyPassengers, config) * 60 * (peak ? config.peakHeadwayFactor : 1),
  );
  const speedKmh =
    baseSpeedKmh(profile.lengthM, profile.durationMin, config) *
    (peak ? config.peakSpeedFactor : 1);
  return {
    routeId: profile.routeId,
    direction: profile.direction,
    lengthM: profile.lengthM,
    headwayS,
    speedMps: speedKmh / 3.6,
    phaseS: stableHash(`${profile.routeId}:${profile.direction}`) % headwayS,
  };
}
