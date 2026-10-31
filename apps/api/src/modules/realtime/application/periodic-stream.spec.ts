import { firstValueFrom, take, toArray } from 'rxjs';
import { periodicStream } from './periodic-stream';

describe('periodicStream', () => {
  it('emits immediately and then periodically, typed', async () => {
    let n = 0;
    const events = await firstValueFrom(
      periodicStream('vehicles', async () => ++n, 5).pipe(take(3), toArray()),
    );
    expect(events).toEqual([
      { type: 'vehicles', data: 1 },
      { type: 'vehicles', data: 2 },
      { type: 'vehicles', data: 3 },
    ]);
  });

  it('skips a failed tick and keeps streaming', async () => {
    let n = 0;
    const errors: unknown[] = [];
    const load = async (): Promise<number> => {
      n++;
      if (n === 2) throw new Error('db hiccup');
      return n;
    };
    const events = await firstValueFrom(
      periodicStream('vehicles', load, 5, (e) => errors.push(e)).pipe(take(2), toArray()),
    );
    expect(events.map((e) => e.data)).toEqual([1, 3]);
    expect(errors).toHaveLength(1);
  });
});
