import type { CrowdLevel } from '../../../common/domain/crowd-level';
import type { RouteCrowdReader } from '../application/simulation.ports';

/** Placeholder until the crowding module provides levels: every route reports "unknown" (null). */
export class NoCrowdDataReader implements RouteCrowdReader {
  async currentLevels(): Promise<ReadonlyMap<number, CrowdLevel>> {
    return new Map();
  }
}
