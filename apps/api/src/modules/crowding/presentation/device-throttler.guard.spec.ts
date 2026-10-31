import { REPORT_RATE_LIMIT, throttleKey } from './device-throttler.guard';

describe('report rate limit', () => {
  it('allows 3 reports per minute', () => {
    expect(REPORT_RATE_LIMIT).toEqual({ limit: 3, ttl: 60_000 });
  });

  it('tracks by deviceId, so two devices behind one IP do not share a limit', () => {
    expect(throttleKey({ deviceId: ' device-1 ' }, '1.1.1.1')).toBe('device:device-1');
    expect(throttleKey({ deviceId: 'device-2' }, '1.1.1.1')).not.toBe(
      throttleKey({ deviceId: 'device-1' }, '1.1.1.1'),
    );
  });

  it('falls back to the IP without a usable deviceId', () => {
    expect(throttleKey({}, '1.1.1.1')).toBe('ip:1.1.1.1');
    expect(throttleKey({ deviceId: '  ' }, undefined)).toBe('ip:unknown');
    expect(throttleKey(undefined, '2.2.2.2')).toBe('ip:2.2.2.2');
  });
});
