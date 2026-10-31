/** Baku is UTC+4 all year (no DST). */
export const BAKU_UTC_OFFSET_MIN = 240;
const MINUTES_PER_DAY = 24 * 60;

export const SIM_CLOCK = Symbol('SIM_CLOCK');

/** Source of "now" for the simulation. Real time by default; an operator may set a demo time. */
export interface SimClock {
  now(): Date;
}

export interface SimClockState {
  now: string;
  bakuTime: string;
  overridden: boolean;
}

/** Minutes since local midnight in Baku, 0 ≤ m < 1440 (fractional). */
export function bakuMinutesOfDay(date: Date): number {
  const minutes = date.getTime() / 60_000 + BAKU_UTC_OFFSET_MIN;
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function formatBakuTime(date: Date): string {
  const m = Math.floor(bakuMinutesOfDay(date));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** "HH:MM" → minutes of day, or null if malformed. */
export function parseHhMm(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * Real clock plus an optional offset. Setting a demo time ("08:15") shifts "now" so that Baku local
 * time reads 08:15 today, and time keeps flowing from there.
 */
export class AdjustableSimClock implements SimClock {
  private offsetMs = 0;

  constructor(private readonly realNow: () => Date = () => new Date()) {}

  now(): Date {
    return new Date(this.realNow().getTime() + this.offsetMs);
  }

  setBakuTime(hhmm: string): void {
    const target = parseHhMm(hhmm);
    if (target === null) throw new RangeError(`Invalid time "${hhmm}", expected HH:MM`);
    const current = bakuMinutesOfDay(this.realNow());
    this.offsetMs = (target - current) * 60_000;
  }

  reset(): void {
    this.offsetMs = 0;
  }

  state(): SimClockState {
    const now = this.now();
    return {
      now: now.toISOString(),
      bakuTime: formatBakuTime(now),
      overridden: this.offsetMs !== 0,
    };
  }
}

export const SIM_CLOCK_CONTROL = Symbol('SIM_CLOCK_CONTROL');

/** Operator-facing control over the demo time (implemented by AdjustableSimClock). */
export interface SimClockControl {
  setBakuTime(hhmm: string): void;
  reset(): void;
  state(): SimClockState;
}
