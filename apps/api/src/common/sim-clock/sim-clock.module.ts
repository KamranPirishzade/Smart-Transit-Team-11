import { Global, Module } from '@nestjs/common';
import { AdjustableSimClock, SIM_CLOCK } from './sim-clock';

/** One shared clock: simulation, crowding and dispatch all agree on "now" (incl. demo time). */
@Global()
@Module({
  providers: [{ provide: SIM_CLOCK, useValue: new AdjustableSimClock() }],
  exports: [SIM_CLOCK],
})
export class SimClockModule {}
