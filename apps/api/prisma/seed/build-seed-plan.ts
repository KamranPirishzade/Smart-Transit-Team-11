import type { LonLat } from '../../src/common/geo/geo.types';
import { lineLengthM } from '../../src/common/geo/polyline';
import { parseDemandCsv } from './parse-demand-csv';
import {
  isInRegion,
  median,
  normalizeLine,
  orientLine,
  projectStopsOntoLine,
} from './project-stops';
import type { SeedFiles, SeedStop } from './seed-files';

/** Lines whose ends are further than this from the first/last stop are kept, but reported. */
const SUSPICIOUS_END_GAP_M = 1500;
/** A source line whose stops sit further than this from it (median) belongs to something else. */
const MAX_MEDIAN_STOP_OFFSET_M = 300;

export interface PlannedStop {
  id: number;
  code: string;
  name: string;
  lat: number;
  lon: number;
  isHub: boolean;
}

export interface PlannedRoute {
  id: number;
  number: string;
  carrier: string | null;
  tariffAzn: number | null;
  lengthKm: number;
  durationMin: number;
  firstPoint: string | null;
  lastPoint: string | null;
  avgDailyPassengers: number | null;
}

export interface PlannedDirection {
  routeId: number;
  direction: number;
  towards: string;
  geometry: LonLat[];
  geometryFromStops: boolean;
  lengthM: number;
  stops: { order: number; stopId: number; distanceFromStartM: number }[];
}

export interface SeedPlan {
  stops: PlannedStop[];
  routes: PlannedRoute[];
  directions: PlannedDirection[];
  warnings: string[];
}

export interface SeedPlanOptions {
  /** Only these AYNA busIds (and the stops they use). Undefined = everything. */
  routeIds?: ReadonlySet<number>;
}

type ValidStop = SeedStop & { lat: number; lon: number };

const toLonLat = (s: ValidStop): LonLat => [s.lon, s.lat];

export function buildSeedPlan(files: SeedFiles, options: SeedPlanOptions = {}): SeedPlan {
  const warnings: string[] = [];
  const demand = parseDemandCsv(files.demandCsv);
  const validStops: ValidStop[] = files.stops.flatMap((s) => {
    if (isInRegion(s.lon, s.lat)) return [{ ...s, lon: s.lon, lat: s.lat as number }];
    warnings.push(`stop ${s.id} "${s.name}": invalid coordinates, skipped`);
    return [];
  });
  const stopsById = new Map(validStops.map((s) => [s.id, s]));
  const buses = options.routeIds
    ? files.buses.filter((b) => options.routeIds!.has(b.busId))
    : files.buses;

  const linesByKey = new Map<string, LonLat[][]>();
  for (const line of files.lines) {
    const key = `${line.busId}-${line.direction}`;
    linesByKey.set(key, [...(linesByKey.get(key) ?? []), line.coordinates]);
  }

  const routes: PlannedRoute[] = buses.map((b) => ({
    id: b.busId,
    number: b.number,
    carrier: b.carrier,
    tariffAzn: b.tariffAzn,
    lengthKm: b.lengthKm,
    durationMin: b.durationMin,
    firstPoint: b.firstPoint,
    lastPoint: b.lastPoint,
    avgDailyPassengers: demand.get(b.number.trim()) ?? null,
  }));

  const directions: PlannedDirection[] = [];
  const usedStopIds = new Set<number>();

  for (const bus of buses) {
    const entries = Object.entries(bus.directions ?? {});
    if (entries.length === 0)
      warnings.push(`route ${bus.number} (${bus.busId}): no directions in source`);

    for (const [dirKey, stopIds] of entries) {
      const direction = Number(dirKey);
      const stops = stopIds.flatMap((id) => {
        const stop = stopsById.get(id);
        if (!stop)
          warnings.push(`route ${bus.number} dir ${direction}: unknown stop ${id} skipped`);
        return stop ? [stop] : [];
      });
      if (stops.length < 2) {
        warnings.push(`route ${bus.number} dir ${direction}: fewer than 2 known stops, skipped`);
        continue;
      }
      const stopPoints = stops.map(toLonLat);
      const firstStop = stopPoints[0]!;
      const lastStop = stopPoints.at(-1)!;

      const label = `route ${bus.number} dir ${direction}`;
      const candidates = (linesByKey.get(`${bus.busId}-${direction}`) ?? [])
        .flatMap((raw) => {
          const normalized = normalizeLine(raw);
          if (!normalized) warnings.push(`${label}: unusable source line dropped`);
          else if (normalized.swapped) warnings.push(`${label}: lat/lon swapped in source, fixed`);
          return normalized ? [orientLine(normalized.line, firstStop, lastStop)] : [];
        })
        .sort((a, b) => a.endGapM - b.endGapM);

      let best = candidates[0];
      let projections = best ? projectStopsOntoLine(best.line, stopPoints) : undefined;
      const fit = projections ? median(projections.map((p) => p.offsetM)) : 0;
      if (best && fit > MAX_MEDIAN_STOP_OFFSET_M) {
        warnings.push(`${label}: line does not fit stops (median ${Math.round(fit)} m), rebuilt`);
        best = undefined;
        projections = undefined;
      } else if (best && best.endGapM > SUSPICIOUS_END_GAP_M) {
        warnings.push(`${label}: line ends ${Math.round(best.endGapM)} m from stops (kept)`);
      }
      if (!best && candidates.length === 0)
        warnings.push(`${label}: no geometry, built from stops`);

      const geometry = best ? best.line : stopPoints;
      projections ??= projectStopsOntoLine(geometry, stopPoints);
      stops.forEach((s) => usedStopIds.add(s.id));
      directions.push({
        routeId: bus.busId,
        direction,
        towards: bus.towards?.[dirKey] ?? (direction === 1 ? bus.lastPoint : bus.firstPoint) ?? '',
        geometry,
        geometryFromStops: !best,
        lengthM: lineLengthM(geometry),
        stops: stops.map((s, i) => ({
          order: i + 1,
          stopId: s.id,
          distanceFromStartM: projections[i]!.distanceM,
        })),
      });
    }
  }

  const stops = (
    options.routeIds ? validStops.filter((s) => usedStopIds.has(s.id)) : validStops
  ).map((s) => ({
    id: s.id,
    code: s.code,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    isHub: s.isTransportHub,
  }));

  return { stops, routes, directions, warnings };
}
