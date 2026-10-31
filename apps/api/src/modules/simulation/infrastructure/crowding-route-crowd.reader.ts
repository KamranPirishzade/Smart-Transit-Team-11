import { Injectable } from '@nestjs/common';
import type { CrowdLevel } from '../../../common/domain/crowd-level';
import { GetRouteCrowdLevels } from '../../crowding/public-api';
import type { RouteCrowdReader } from '../application/simulation.ports';

/** Simulation asks the crowding module (baseline + passenger reports) for each route's level. */
@Injectable()
export class CrowdingRouteCrowdReader implements RouteCrowdReader {
  constructor(private readonly levels: GetRouteCrowdLevels) {}

  currentLevels(routeIds: readonly number[], now: Date): Promise<ReadonlyMap<number, CrowdLevel>> {
    return this.levels.execute(routeIds, now);
  }
}
