import { AdjustableSimClock, bakuMinutesOfDay, formatBakuTime, parseHhMm } from './sim-clock';

// 2026-10-31T06:00:00Z is 10:00 in Baku
const realNow = new Date('2026-10-31T06:00:00Z');

describe('Baku time helpers', () => {
  it('converts UTC to Baku minutes of day (UTC+4)', () => {
    expect(bakuMinutesOfDay(realNow)).toBe(600);
    expect(bakuMinutesOfDay(new Date('2026-10-31T22:30:00Z'))).toBe(150);
    expect(formatBakuTime(realNow)).toBe('10:00');
  });

  it('parses HH:MM strictly', () => {
    expect(parseHhMm('08:15')).toBe(495);
    expect(parseHhMm('24:00')).toBeNull();
    expect(parseHhMm('8:15')).toBeNull();
  });
});

describe('AdjustableSimClock', () => {
  it('follows the real clock by default', () => {
    const clock = new AdjustableSimClock(() => realNow);
    expect(clock.now()).toEqual(realNow);
    expect(clock.state().overridden).toBe(false);
  });

  it('shifts to a demo time and resets', () => {
    let real = realNow.getTime();
    const clock = new AdjustableSimClock(() => new Date(real));
    clock.setBakuTime('08:15');
    expect(formatBakuTime(clock.now())).toBe('08:15');
    real += 5 * 60_000;
    expect(formatBakuTime(clock.now())).toBe('08:20');
    expect(clock.state()).toMatchObject({ bakuTime: '08:20', overridden: true });
    clock.reset();
    expect(formatBakuTime(clock.now())).toBe('10:05');
  });

  it('rejects malformed demo times', () => {
    expect(() => new AdjustableSimClock().setBakuTime('25:00')).toThrow(RangeError);
  });
});
