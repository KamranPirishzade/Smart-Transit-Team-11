import type { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable } from 'rxjs';
import type { DomainEventMap } from './domain-events';

export interface DomainEventMessage {
  type: keyof DomainEventMap;
  data: DomainEventMap[keyof DomainEventMap];
}

/** Live view of domain events as an Observable (unsubscribing removes the listeners). */
export function domainEventStream(
  emitter: EventEmitter2,
  names: readonly (keyof DomainEventMap)[],
): Observable<DomainEventMessage> {
  return new Observable((subscriber) => {
    const listeners = names.map((type) => {
      const listener = (data: DomainEventMap[keyof DomainEventMap]): void =>
        subscriber.next({ type, data });
      emitter.on(type, listener);
      return { type, listener };
    });
    return () => listeners.forEach(({ type, listener }) => emitter.off(type, listener));
  });
}
