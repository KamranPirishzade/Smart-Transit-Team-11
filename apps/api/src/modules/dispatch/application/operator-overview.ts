import { InvalidInputError } from '../../../common/errors/domain-errors';
import type { SimClockControl, SimClockState } from '../../../common/sim-clock/sim-clock';
import type { CrowdSignals, RecommendationRepository, ReportedRouteSample } from './dispatch.ports';

export interface OperatorOverview {
  clock: SimClockState;
  pendingRecommendations: number;
  activeReserves: number;
  /** Reports in the last 10 minutes, all routes. */
  recentReports: number;
  /** The most crowded routes (by passenger reports) right now. */
  crowdedRoutes: ReportedRouteSample[];
}

const TOP_ROUTES = 5;

export class GetOperatorOverview {
  constructor(
    private readonly recommendations: RecommendationRepository,
    private readonly signals: CrowdSignals,
    private readonly clock: SimClockControl,
  ) {}

  async execute(): Promise<OperatorOverview> {
    const [pending, reserves, reported] = await Promise.all([
      this.recommendations.countPending(),
      this.recommendations.countActiveReserves(),
      this.signals.reportedRoutes(),
    ]);
    return {
      clock: this.clock.state(),
      pendingRecommendations: pending,
      activeReserves: reserves,
      recentReports: reported.reduce((sum, r) => sum + r.reportCount, 0),
      crowdedRoutes: reported.slice(0, TOP_ROUTES),
    };
  }
}

/** Demo time: `time` = "HH:MM" (Baku) shifts the simulation, `null` returns to real time. */
export class SetSimClock {
  constructor(private readonly clock: SimClockControl) {}

  execute(time: string | null): SimClockState {
    if (time === null) {
      this.clock.reset();
    } else {
      try {
        this.clock.setBakuTime(time);
      } catch (error) {
        if (error instanceof RangeError) throw new InvalidInputError(error.message);
        throw error;
      }
    }
    return this.clock.state();
  }
}
