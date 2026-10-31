import { Injectable } from '@nestjs/common';
import { GetRouteDemand } from '../../network/public-api';
import type { RouteDemandReader } from '../application/crowding.ports';

/** Crowding reads route demand from the network module through its public API. */
@Injectable()
export class NetworkRouteDemandReader implements RouteDemandReader {
  constructor(private readonly getRouteDemand: GetRouteDemand) {}

  demands(): Promise<ReadonlyMap<number, number | null>> {
    return this.getRouteDemand.execute();
  }
}
