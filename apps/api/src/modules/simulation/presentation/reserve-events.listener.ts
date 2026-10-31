import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DISPATCH_RESERVE_ADDED } from '../../../common/events/domain-events';
import { PrismaReserveVehicleSource } from '../infrastructure/prisma-reserve-vehicle.source';

/** A dispatched reserve bus appears in the next stream tick instead of after the cache TTL. */
@Injectable()
export class ReserveEventsListener {
  constructor(private readonly reserves: PrismaReserveVehicleSource) {}

  @OnEvent(DISPATCH_RESERVE_ADDED)
  onReserveAdded(): void {
    this.reserves.invalidate();
  }
}
