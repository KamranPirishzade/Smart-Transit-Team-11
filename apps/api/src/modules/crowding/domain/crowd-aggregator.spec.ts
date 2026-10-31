import { aggregateRouteCrowd, reportWeight } from './crowd-aggregator';
import { baselineScore, demandIndex, hourFactor } from './crowd-baseline';

// 2026-10-31T04:00:00Z is 08:00 in Baku (morning peak)
const PEAK = new Date('2026-10-31T04:00:00Z');
const NIGHT = new Date('2026-10-30T23:00:00Z'); // 03:00 in Baku
const ago = (minutes: number, from = PEAK): Date => new Date(from.getTime() - minutes * 60_000);

describe('reportWeight', () => {
  it('is 1 when fresh, 0.5 after the 5 min half-life, 0 after 10 min', () => {
    expect(reportWeight(0)).toBe(1);
    expect(reportWeight(5 * 60_000)).toBeCloseTo(0.5, 10);
    expect(reportWeight(10 * 60_000)).toBeCloseTo(0.25, 10);
    expect(reportWeight(10 * 60_000 + 1)).toBe(0);
  });

  it('ignores reports from the future', () => {
    expect(reportWeight(-1)).toBe(0);
  });
});

describe('aggregateRouteCrowd', () => {
  it('uses the baseline when there are no recent reports', () => {
    const result = aggregateRouteCrowd([], 9000, PEAK);
    expect(result.source).toBe('baseline');
    expect(result.reportCount).toBe(0);
    expect(result.score).toBeCloseTo(baselineScore(9000, PEAK), 10);
  });

  it('ignores reports outside the window', () => {
    const result = aggregateRouteCrowd([{ level: 'FULL', createdAt: ago(11, NIGHT) }], 100, NIGHT);
    expect(result.source).toBe('baseline');
  });

  it('lets reports override the baseline', () => {
    const result = aggregateRouteCrowd([{ level: 'EMPTY', createdAt: ago(0) }], 9000, PEAK);
    expect(result).toMatchObject({ source: 'reports', level: 'EMPTY', reportCount: 1 });
  });

  it('weights newer reports more (half-life 5 min)', () => {
    // fresh EMPTY has weight 1, a 5 min old FULL has weight 0.5: (0 * 1 + 3 * 0.5) / 1.5 = 1
    const result = aggregateRouteCrowd(
      [
        { level: 'EMPTY', createdAt: ago(0) },
        { level: 'FULL', createdAt: ago(5) },
      ],
      null,
      PEAK,
    );
    expect(result.score).toBeCloseTo(1, 10);
    expect(result.level).toBe('MODERATE');
  });
});

describe('baseline', () => {
  it('is highest in the peak hour and lowest at night', () => {
    expect(hourFactor(PEAK)).toBe(1);
    expect(hourFactor(NIGHT)).toBeLessThan(0.1);
  });

  it('grows with route demand and falls back to a middle value when unknown', () => {
    expect(demandIndex(9000)).toBe(1);
    expect(demandIndex(100)).toBe(0.15);
    expect(demandIndex(null)).toBe(0.4);
    expect(baselineScore(9000, PEAK)).toBe(3);
    expect(baselineScore(4500, PEAK)).toBeLessThan(baselineScore(9000, PEAK));
  });
});
