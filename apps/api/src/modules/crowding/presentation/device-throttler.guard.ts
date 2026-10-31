import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/** Report rate limit: 3 per minute. */
export const REPORT_RATE_LIMIT = { limit: 3, ttl: 60_000 } as const;

/** Rate limits per device id (falls back to the IP when the body has no usable id). */
export function throttleKey(body: unknown, ip: string | undefined): string {
  const deviceId = (body as { deviceId?: unknown } | undefined)?.deviceId;
  if (typeof deviceId === 'string' && deviceId.trim().length > 0) {
    return `device:${deviceId.trim().slice(0, 64)}`;
  }
  return `ip:${ip ?? 'unknown'}`;
}

@Injectable()
export class DeviceThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(throttleKey(req.body, req.ip as string | undefined));
  }
}
