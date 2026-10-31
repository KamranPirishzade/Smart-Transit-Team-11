/** Shared kernel: passenger crowding level, used by crowding, simulation and dispatch. */
export const CROWD_LEVELS = ['EMPTY', 'MODERATE', 'CROWDED', 'FULL'] as const;

export type CrowdLevel = (typeof CROWD_LEVELS)[number];

const SCORES: Record<CrowdLevel, number> = { EMPTY: 0, MODERATE: 1, CROWDED: 2, FULL: 3 };

export function crowdScore(level: CrowdLevel): number {
  return SCORES[level];
}

/** Nearest level for an averaged score (0..3). */
export function levelFromScore(score: number): CrowdLevel {
  const index = Math.min(3, Math.max(0, Math.round(score)));
  return CROWD_LEVELS[index]!;
}

export function isHighCrowd(level: CrowdLevel): boolean {
  return level === 'CROWDED' || level === 'FULL';
}
