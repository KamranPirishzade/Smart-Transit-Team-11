import {
  catchError,
  EMPTY,
  exhaustMap,
  from,
  map,
  type Observable,
  type SchedulerLike,
  timer,
} from 'rxjs';

export interface StreamEvent<T> {
  type: string;
  data: T;
}

/**
 * Emits `load()` immediately and then every `periodMs`. A slow tick is never overlapped
 * (exhaustMap) and a failed tick is skipped instead of closing the client's stream.
 */
export function periodicStream<T>(
  type: string,
  load: () => Promise<T>,
  periodMs: number,
  onError: (error: unknown) => void = () => undefined,
  scheduler?: SchedulerLike,
): Observable<StreamEvent<T>> {
  return timer(0, periodMs, scheduler).pipe(
    exhaustMap(() =>
      from(load()).pipe(
        catchError((error: unknown) => {
          onError(error);
          return EMPTY;
        }),
      ),
    ),
    map((data) => ({ type, data })),
  );
}
