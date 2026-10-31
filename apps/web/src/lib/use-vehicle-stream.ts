'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useEffect, useState } from 'react';
import { API_URL } from './api';

export type Vehicle = Schemas['VehicleDto'];
export interface VehicleFilter {
  routeId?: number;
  bbox?: string;
}

/** Live buses over SSE (`/stream/vehicles`); reconnects when the filter changes. */
export function useVehicleStream(filter: VehicleFilter | null): Vehicle[] {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const routeId = filter?.routeId;
  const bbox = filter?.bbox;

  useEffect(() => {
    if (routeId === undefined && !bbox) return;
    const query = routeId !== undefined ? `routeId=${routeId}` : `bbox=${bbox}`;
    const source = new EventSource(`${API_URL}/api/stream/vehicles?${query}`);
    source.addEventListener('vehicles', (event) => {
      const snapshot = JSON.parse((event as MessageEvent<string>).data) as {
        vehicles: Vehicle[];
      };
      setVehicles(snapshot.vehicles);
    });
    return () => source.close();
  }, [routeId, bbox]);

  return routeId === undefined && !bbox ? [] : vehicles;
}
