import type { CrowdLevel } from '../../../common/domain/crowd-level';
import { type BBox, bboxContains } from '../../../common/geo/bbox';
import { bearingAtDistance, pointAtDistance } from '../../../common/geo/polyline';
import {
  bakuMinutesOfDay,
  formatBakuTime,
  type SimClock,
} from '../../../common/sim-clock/sim-clock';
import {
  activeVehicles,
  reservePosition,
  type VehiclePosition,
} from '../domain/schedule-simulator';
import { serviceAt } from '../domain/service-plan';
import type { SimulationConfig } from '../domain/simulation.config';
import { directionKey, type IndexedDirection, type SimulationNetwork } from './simulation-network';
import type { ReserveVehicleSource, RouteCrowdReader } from './simulation.ports';

export type VehicleFilter = { routeId: number } | { bbox: BBox };

export const MAX_VEHICLES_PER_SNAPSHOT = 800;

export interface VehicleView {
  id: string;
  routeId: number;
  routeNumber: string;
  direction: number;
  towards: string;
  lat: number;
  lon: number;
  /** Degrees, 0 = north, clockwise. */
  bearing: number;
  distanceM: number;
  /** 0..1 along the direction. */
  progress: number;
  speedKmh: number;
  nextStopId: number | null;
  isReserve: boolean;
  crowdLevel: CrowdLevel | null;
}

export interface VehiclesSnapshot {
  generatedAt: string;
  /** Simulation (Baku) clock, HH:MM — differs from wall time when a demo time is set. */
  simTime: string;
  total: number;
  truncated: boolean;
  vehicles: VehicleView[];
}

function nextStopId(direction: IndexedDirection, distanceM: number): number | null {
  return direction.stops.find((s) => s.distanceFromStartM > distanceM)?.stopId ?? null;
}

export class GetVehicles {
  constructor(
    private readonly network: SimulationNetwork,
    private readonly reserves: ReserveVehicleSource,
    private readonly crowd: RouteCrowdReader,
    private readonly clock: SimClock,
    private readonly config: SimulationConfig,
  ) {}

  async execute(
    filter: VehicleFilter,
    limit = MAX_VEHICLES_PER_SNAPSHOT,
  ): Promise<VehiclesSnapshot> {
    const now = this.clock.now();
    const nowS = now.getTime() / 1000;
    const minutes = bakuMinutesOfDay(now);
    const index = await this.network.get();
    const directions =
      'routeId' in filter ? (index.byRoute.get(filter.routeId) ?? []) : index.directions;
    const reserves = await this.reserves.activeReserves();

    const views: Omit<VehicleView, 'crowdLevel'>[] = [];
    for (const direction of directions) {
      const service = serviceAt(direction.profile, minutes, this.config);
      const positions: VehiclePosition[] = activeVehicles(service, nowS);
      for (const r of reserves) {
        if (directionKey(r.routeId, r.direction) !== direction.key) continue;
        const p = reservePosition(service, r, nowS);
        if (p) positions.push(p);
      }
      for (const p of positions) {
        const [lon, lat] = pointAtDistance(direction.geometry, direction.cumulative, p.distanceM);
        if ('bbox' in filter && !bboxContains(filter.bbox, [lon, lat])) continue;
        views.push({
          id: p.vehicleId,
          routeId: direction.routeId,
          routeNumber: direction.routeNumber,
          direction: direction.direction,
          towards: direction.towards,
          lat,
          lon,
          bearing: Math.round(
            bearingAtDistance(direction.geometry, direction.cumulative, p.distanceM),
          ),
          distanceM: Math.round(p.distanceM),
          progress: Math.min(1, p.distanceM / direction.lengthM),
          speedKmh: Math.round(service.speedMps * 3.6),
          nextStopId: nextStopId(direction, p.distanceM),
          isReserve: p.isReserve,
        });
      }
    }

    const kept = views.slice(0, limit);
    const levels = await this.crowd.currentLevels([...new Set(kept.map((v) => v.routeId))], now);
    return {
      generatedAt: now.toISOString(),
      simTime: formatBakuTime(now),
      total: views.length,
      truncated: views.length > kept.length,
      vehicles: kept.map((v) => ({ ...v, crowdLevel: levels.get(v.routeId) ?? null })),
    };
  }
}
