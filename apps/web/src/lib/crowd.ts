export type CrowdLevel = 'EMPTY' | 'MODERATE' | 'CROWDED' | 'FULL';

export const CROWD_COLORS: Record<CrowdLevel, string> = {
  EMPTY: '#16a34a',
  MODERATE: '#eab308',
  CROWDED: '#f97316',
  FULL: '#dc2626',
};
export const UNKNOWN_CROWD_COLOR = '#64748b';

export const CROWD_LABELS: Record<CrowdLevel, string> = {
  EMPTY: 'Boşdur',
  MODERATE: 'Orta',
  CROWDED: 'Sıxdır',
  FULL: 'Doludur',
};

export function crowdLabel(level: CrowdLevel | null): string {
  return level ? CROWD_LABELS[level] : 'Məlum deyil';
}
