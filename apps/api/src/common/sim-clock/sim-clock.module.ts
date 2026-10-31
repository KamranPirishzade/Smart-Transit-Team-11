import { Global, Module } from '@nestjs/common';
import { AdjustableSimClock, SIM_CLOCK, SIM_CLOCK_CONTROL } from './sim-clock';

/** One shared clock: simulation, crowding and dispatch all agree on "now" (incl. demo time). */
@Global()
@Module({
  providers: [
    { provide: SIM_CLOCK, useValue: new AdjustableSimClock() },
    { provide: SIM_CLOCK_CONTROL, useExisting: SIM_CLOCK },
  ],
  exports: [SIM_CLOCK, SIM_CLOCK_CONTROL],
})
export class SimClockModule {}
