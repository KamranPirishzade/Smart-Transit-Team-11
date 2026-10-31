import { NotFoundError } from '../../../common/errors/domain-errors';
import { bboxAround } from '../../../common/geo/bbox';
import {
  MAX_NEARBY_RADIUS_M,
  type NearbyStop,
  selectNearbyStops,
  type StopDetails,
} from '../domain/stop';
import type { StopRepository } from './network.ports';

export interface NearbyStopsQuery {
  lat: number;
  lon: number;
  radiusM?: number;
  limit?: number;
}

export class FindNearbyStops {
  constructor(private readonly stops: StopRepository) {}

  async execute({ lat, lon, radiusM = 500, limit = 20 }: NearbyStopsQuery): Promise<NearbyStop[]> {
    const radius = Math.min(radiusM, MAX_NEARBY_RADIUS_M);
    const candidates = await this.stops.findInBox(bboxAround([lon, lat], radius));
    return selectNearbyStops(candidates, [lon, lat], radius, limit);
  }
}

export class GetStopDetails {
  constructor(private readonly stops: StopRepository) {}

  async execute(id: number): Promise<StopDetails> {
    const stop = await this.stops.findDetails(id);
    if (!stop) throw new NotFoundError('Stop', id);
    return stop;
  }
}
