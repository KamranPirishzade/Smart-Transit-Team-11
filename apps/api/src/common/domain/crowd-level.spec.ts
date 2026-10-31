import { CROWD_LEVELS, crowdScore, isHighCrowd, levelFromScore } from './crowd-level';

describe('crowd level', () => {
  it('scores levels 0..3 in order', () => {
    expect(CROWD_LEVELS.map(crowdScore)).toEqual([0, 1, 2, 3]);
  });

  it('rounds and clamps averaged scores', () => {
    expect(levelFromScore(1.4)).toBe('MODERATE');
    expect(levelFromScore(1.5)).toBe('CROWDED');
    expect(levelFromScore(-2)).toBe('EMPTY');
    expect(levelFromScore(9)).toBe('FULL');
  });

  it('treats CROWDED and FULL as high', () => {
    expect(CROWD_LEVELS.filter(isHighCrowd)).toEqual(['CROWDED', 'FULL']);
  });
});
