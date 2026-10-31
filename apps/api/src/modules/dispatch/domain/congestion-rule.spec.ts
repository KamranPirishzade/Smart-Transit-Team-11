import {
  describeCongestion,
  evaluateCongestion,
  MIN_HIGH_REPORTS,
  type ReportSample,
} from './congestion-rule';
import { reserveDirectionOf } from './recommendation';

const NOW = new Date('2026-10-31T06:00:00Z');
const at = (minutesAgo: number): Date => new Date(NOW.getTime() - minutesAgo * 60_000);

function reports(
  high: number,
  low: number,
  opts: { direction?: number | null; minutesAgo?: number } = {},
): ReportSample[] {
  const make = (level: ReportSample['level']): ReportSample => ({
    level,
    direction: opts.direction === undefined ? 1 : opts.direction,
    createdAt: at(opts.minutesAgo ?? 1),
  });
  return [
    ...Array.from({ length: high }, (_, i) => make(i % 2 === 0 ? 'FULL' : 'CROWDED')),
    ...Array.from({ length: low }, () => make('MODERATE')),
  ];
}

const evaluate = (list: ReportSample[], hasPending = false) =>
  evaluateCongestion({ reports: list, now: NOW, hasPendingRecommendation: hasPending });

describe('evaluateCongestion', () => {
  it('fires at exactly 8 high reports that are 60% or more of all', () => {
    // 8 of 13 = 61.5%
    const verdict = evaluate(reports(8, 5));
    expect(verdict).toMatchObject({ triggered: true, highReports: 8, totalReports: 13 });
  });

  it('does not fire below 8 high reports, even at 100%', () => {
    expect(evaluate(reports(MIN_HIGH_REPORTS - 1, 0)).triggered).toBe(false);
  });

  it('does not fire when the high share is under 60%', () => {
    // 8 of 14 = 57%
    expect(evaluate(reports(8, 6)).triggered).toBe(false);
  });

  it('fires at exactly 60%', () => {
    // 9 of 15 = 60%
    expect(evaluate(reports(9, 6)).triggered).toBe(true);
  });

  it('does not fire while a PENDING recommendation exists', () => {
    expect(evaluate(reports(12, 0), true).triggered).toBe(false);
  });

  it('counts only the last 10 minutes', () => {
    expect(evaluate(reports(12, 0, { minutesAgo: 11 })).triggered).toBe(false);
    expect(evaluate(reports(12, 0, { minutesAgo: 9.9 })).triggered).toBe(true);
  });

  it('handles no reports', () => {
    expect(evaluate([])).toMatchObject({ triggered: false, highShare: 0, direction: null });
  });

  it('picks the direction with most high reports, null when unknown', () => {
    const mixed = [...reports(5, 0, { direction: 2 }), ...reports(3, 0, { direction: 1 })];
    expect(evaluate(mixed).direction).toBe(2);
    expect(evaluate(reports(8, 0, { direction: null })).direction).toBeNull();
  });

  it('describes the verdict in Azerbaijani', () => {
    const text = describeCongestion(evaluate(reports(8, 2)));
    expect(text).toContain('10 bildirişdən 8-i (80%)');
  });
});

describe('reserveDirectionOf', () => {
  it('falls back to direction 1 when the recommendation has none', () => {
    expect(reserveDirectionOf({ direction: null })).toBe(1);
    expect(reserveDirectionOf({ direction: 2 })).toBe(2);
  });
});
