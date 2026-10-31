'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useEffect, useRef, useState } from 'react';
import { API_URL } from './api';

export type Vehicle = Schemas['VehicleDto'];
export interface VehicleFilter {
  routeId?: number;
  bbox?: string;
}

export function interpolatePosition(
  from: Pick<Vehicle, 'lat' | 'lon'>,
  to: Pick<Vehicle, 'lat' | 'lon'>,
  progress: number,
): Pick<Vehicle, 'lat' | 'lon'> {
  const clamped = Math.max(0, Math.min(1, progress));
  return {
    lat: from.lat + (to.lat - from.lat) * clamped,
    lon: from.lon + (to.lon - from.lon) * clamped,
  };
}

/** Live buses over SSE (`/stream/vehicles`); reconnects when the filter changes. */
export function useVehicleStream(filter: VehicleFilter | null): Vehicle[] {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const previous = useRef<Vehicle[] | null>(null);
  const animation = useRef<number | null>(null);
  const routeId = filter?.routeId;
  const bbox = filter?.bbox;

  useEffect(() => {
    previous.current = null;
    if (routeId === undefined && !bbox) return;
    const query = routeId !== undefined ? `routeId=${routeId}` : `bbox=${bbox}`;
    const source = new EventSource(`${API_URL}/api/stream/vehicles?${query}`);
    source.addEventListener('vehicles', (event) => {
      const snapshot = JSON.parse((event as MessageEvent<string>).data) as {
        vehicles: Vehicle[];
      };
      const next = snapshot.vehicles;
      const from = previous.current;
      previous.current = next;
      if (!from) {
        setVehicles(next);
        return;
      }

      if (animation.current !== null) cancelAnimationFrame(animation.current);
      const byId = new Map(from.map((vehicle) => [vehicle.id, vehicle]));
      const started = performance.now();
      const duration = 1800;
      const animate = (now: number) => {
        const progress = Math.min(1, (now - started) / duration);
        setVehicles(
          next.map((vehicle) => {
            const old = byId.get(vehicle.id);
            if (!old) return vehicle;
            return { ...vehicle, ...interpolatePosition(old, vehicle, progress) };
          }),
        );
        if (progress < 1) animation.current = requestAnimationFrame(animate);
        else animation.current = null;
      };
      animation.current = requestAnimationFrame(animate);
    });
    return () => {
      source.close();
      if (animation.current !== null) cancelAnimationFrame(animation.current);
      animation.current = null;
    };
  }, [routeId, bbox]);

  return routeId === undefined && !bbox ? [] : vehicles;
}
