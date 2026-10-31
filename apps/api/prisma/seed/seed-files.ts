import fs from 'node:fs';
import path from 'node:path';
import type { LonLat } from '../../src/common/geo/geo.types';

export interface SeedStop {
  id: number;
  code: string;
  name: string;
  /** null for a handful of stops in the AYNA export */
  lat: number | null;
  lon: number | null;
  isTransportHub: boolean;
}

export interface SeedBus {
  busId: number;
  number: string;
  carrier: string | null;
  tariffAzn: number | null;
  lengthKm: number;
  durationMin: number;
  firstPoint: string | null;
  lastPoint: string | null;
  /** direction ("1" | "2") → ordered stop ids */
  directions: Record<string, number[]>;
  towards?: Record<string, string>;
}

export interface SeedLineFeature {
  busId: number;
  direction: number;
  coordinates: LonLat[];
}

export interface SeedFiles {
  stops: SeedStop[];
  buses: SeedBus[];
  lines: SeedLineFeature[];
  demandCsv: string;
}

interface Envelope<T> {
  source: string;
  fetchedAt: string;
  items: T[];
}

interface GeoJsonCollection {
  features: {
    properties: { busId: number; directionTypeId: number };
    geometry: { type: string; coordinates: [number, number][] };
  }[];
}

const readJson = <T>(file: string): T => JSON.parse(fs.readFileSync(file, 'utf8')) as T;

export function loadSeedFiles(dataDir: string): SeedFiles {
  const stops = readJson<Envelope<SeedStop>>(path.join(dataDir, 'stops.json')).items;
  const buses = readJson<Envelope<SeedBus>>(path.join(dataDir, 'buses.json')).items;
  const geo = readJson<GeoJsonCollection>(path.join(dataDir, 'bus-lines-ayna.geojson'));
  const lines = geo.features
    .filter((f) => f.geometry.type === 'LineString')
    .map((f) => ({
      busId: f.properties.busId,
      direction: f.properties.directionTypeId,
      coordinates: f.geometry.coordinates,
    }));
  const demandCsv = fs.readFileSync(path.join(dataDir, 'bakubus_daily_2026.csv'), 'utf8');
  return { stops, buses, lines, demandCsv };
}
