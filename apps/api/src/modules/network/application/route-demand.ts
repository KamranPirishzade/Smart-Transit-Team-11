export const ROUTE_DEMAND_SOURCE = Symbol('ROUTE_DEMAND_SOURCE');

/** Average daily ridership per route id (null = not in the BakuBus dataset). */
export interface RouteDemandSource {
  loadAll(): Promise<ReadonlyMap<number, number | null>>;
}

/** Demand is real but static, so it is loaded once and kept. Every known route id is a key. */
export class GetRouteDemand {
  private cached?: Promise<ReadonlyMap<number, number | null>>;

  constructor(private readonly source: RouteDemandSource) {}

  execute(): Promise<ReadonlyMap<number, number | null>> {
    this.cached ??= this.source.loadAll().catch((error: unknown) => {
      this.cached = undefined;
      throw error;
    });
    return this.cached;
  }
}
