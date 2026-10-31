import type { CrowdLevel } from '../../../common/domain/crowd-level';
import { NotFoundError } from '../../../common/errors/domain-errors';
import {
  bakuMinutesOfDay,
  formatBakuTime,
  type SimClock,
} from '../../../common/sim-clock/sim-clock';
import { mergeArrivals, regularArrivals, reserveArrivals } from '../domain/eta-calculator';
import { serviceAt } from '../domain/service-plan';
import type { SimulationConfig } from '../domain/simulation.config';
import { directionKey, type SimulationNetwork } from './simulation-network';
import type { ReserveVehicleSource, RouteCrowdReader } from './simulation.ports';

export interface ArrivalView {
  routeId: number;
  routeNumber: string;
  direction: number;
  towards: string;
  vehicleId: string;
  etaS: number;
  /** Rounded up, so "0" only when the bus is at the stop. */
  etaMin: number;
  isReserve: boolean;
  crowdLevel: CrowdLevel | null;
}

export interface StopArrivals {
  stopId: number;
  generatedAt: string;
  simTime: string;
  arrivals: ArrivalView[];
}

export class GetStopArrivals {
  constructor(
    private readonly network: SimulationNetwork,
    private readonly reserves: ReserveVehicleSource,
    private readonly crowd: RouteCrowdReader,
    private readonly clock: SimClock,
    private readonly config: SimulationConfig,
  ) {}

  async execute(stopId: number, limit = 10): Promise<StopArrivals> {
    const index = await this.network.get();
    const served = index.byStop.get(stopId);
    if (!served) throw new NotFoundError('Stop', stopId);

    const now = this.clock.now();
    const nowS = now.getTime() / 1000;
    const minutes = bakuMinutesOfDay(now);
    const reserves = await this.reserves.activeReserves();

    const lists = served.map(({ direction, distanceM }) => {
      const service = serviceAt(direction.profile, minutes, this.config);
      const fromReserves = reserves
        .filter((r) => directionKey(r.routeId, r.direction) === direction.key)
        .flatMap((r) => reserveArrivals(service, r, distanceM, nowS, 1));
      return [...regularArrivals(service, distanceM, nowS, limit), ...fromReserves];
    });
    const merged = mergeArrivals(lists, limit);
    const levels = await this.crowd.currentLevels([...new Set(merged.map((a) => a.routeId))], now);

    return {
      stopId,
      generatedAt: now.toISOString(),
      simTime: formatBakuTime(now),
      arrivals: merged.map((a) => {
        const direction = index.byKey.get(directionKey(a.routeId, a.direction))!;
        return {
          routeId: a.routeId,
          routeNumber: direction.routeNumber,
          direction: a.direction,
          towards: direction.towards,
          vehicleId: a.vehicleId,
          etaS: Math.round(a.etaS),
          etaMin: Math.ceil(a.etaS / 60),
          isReserve: a.isReserve,
          crowdLevel: levels.get(a.routeId) ?? null,
        };
      }),
    };
  }
}
