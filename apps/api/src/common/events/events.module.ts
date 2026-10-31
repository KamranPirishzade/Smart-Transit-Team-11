import { Global, Module } from '@nestjs/common';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import type { DomainEventMap } from './domain-events';
import { EVENT_PUBLISHER, type EventPublisher } from './event-publisher';

class EmitterEventPublisher implements EventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  publish<K extends keyof DomainEventMap>(name: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(name, payload);
  }
}

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [
    {
      provide: EVENT_PUBLISHER,
      useFactory: (emitter: EventEmitter2): EventPublisher => new EmitterEventPublisher(emitter),
      inject: [EventEmitter2],
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class EventsModule {}
