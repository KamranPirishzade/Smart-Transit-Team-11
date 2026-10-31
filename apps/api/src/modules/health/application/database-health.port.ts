export const DATABASE_HEALTH = Symbol('DATABASE_HEALTH');

export interface DatabaseHealth {
  /** Resolves when the database answers a trivial query, rejects otherwise. */
  ping(): Promise<void>;
}
