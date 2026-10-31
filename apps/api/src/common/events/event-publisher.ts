import type { DomainEventMap } from './domain-events';

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

/** Port used by use cases to announce what happened; listeners live in other modules' presentation layer. */
export interface EventPublisher {
  publish<K extends keyof DomainEventMap>(name: K, payload: DomainEventMap[K]): void;
}
