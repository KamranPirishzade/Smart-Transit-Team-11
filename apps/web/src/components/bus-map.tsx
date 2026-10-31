'use client';

import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { CROWD_COLORS, CROWD_LABELS, type CrowdLevel, UNKNOWN_CROWD_COLOR } from '@/lib/crowd';
import type { Vehicle } from '@/lib/use-vehicle-stream';

// Turbopack does not emit the worker's sibling shared module; serve both from /public.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');

export interface MapStop {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

export interface HeatPoint {
  lat: number;
  lon: number;
  level: string;
}

interface Props {
  vehicles?: Vehicle[];
  lines?: [number, number][][];
  stops?: MapStop[];
  /** Crowding report cells (operator map). */
  heat?: HeatPoint[];
  center?: [number, number];
  zoom?: number;
  showControls?: boolean;
  showLegend?: boolean;
  onStopClick?: (id: number) => void;
  /** minLon,minLat,maxLon,maxLat of the visible area. */
  onBoundsChange?: (bbox: string) => void;
  className?: string;
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const BAKU: [number, number] = [49.8671, 40.4093];
/** Below this zoom ordinary buses are hidden (too dense); reserve buses always stay visible. */
const MIN_BUS_ZOOM = 11;
const EMPTY: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

const crowdColor: maplibregl.ExpressionSpecification = [
  'match',
  ['get', 'crowd'],
  'EMPTY',
  CROWD_COLORS.EMPTY,
  'MODERATE',
  CROWD_COLORS.MODERATE,
  'CROWDED',
  CROWD_COLORS.CROWDED,
  'FULL',
  CROWD_COLORS.FULL,
  UNKNOWN_CROWD_COLOR,
];

export function BusMap({
  vehicles = [],
  lines,
  stops,
  heat,
  center = BAKU,
  zoom = 11.5,
  showControls = true,
  showLegend = true,
  onStopClick,
  onBoundsChange,
  className,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const handlers = useRef({ onStopClick, onBoundsChange });
  useEffect(() => {
    handlers.current = { onStopClick, onBoundsChange };
  });

  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: STYLE_URL,
      center,
      zoom,
    });
    mapRef.current = map;
    if (showControls) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    }

    const reportBounds = () => {
      const b = map.getBounds();
      handlers.current.onBoundsChange?.(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(4)).join(','),
      );
    };

    const syncVehicleVisibility = () => {
      if (!map.getLayer('vehicles')) return;
      map.setLayoutProperty(
        'vehicles',
        'visibility',
        map.getZoom() < MIN_BUS_ZOOM ? 'none' : 'visible',
      );
    };

    map.on('load', () => {
      map.addSource('lines', { type: 'geojson', data: EMPTY });
      map.addSource('heat', { type: 'geojson', data: EMPTY });
      map.addSource('stops', { type: 'geojson', data: EMPTY });
      map.addSource('vehicles', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'lines',
        type: 'line',
        source: 'lines',
        paint: { 'line-color': '#0154e2', 'line-width': 4, 'line-opacity': 0.8 },
      });
      map.addLayer({
        id: 'heat',
        type: 'circle',
        source: 'heat',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 15, 34],
          'circle-color': crowdColor,
          'circle-opacity': 0.45,
          'circle-blur': 0.5,
        },
      });
      map.addLayer({
        id: 'stops',
        type: 'circle',
        source: 'stops',
        paint: {
          'circle-radius': 5,
          'circle-color': '#ffffff',
          'circle-stroke-color': '#0154e2',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'vehicles',
        type: 'circle',
        source: 'vehicles',
        filter: ['!', ['get', 'reserve']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 4, 15, 8],
          'circle-color': crowdColor,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        },
      });
      // Reserve buses: crowd-coloured core inside a coral ring, plus a soft outer halo.
      map.addLayer({
        id: 'reserve-halo',
        type: 'circle',
        source: 'vehicles',
        filter: ['get', 'reserve'],
        paint: { 'circle-radius': 20, 'circle-color': '#f0643c', 'circle-opacity': 0.18 },
      });
      map.addLayer({
        id: 'reserves',
        type: 'circle',
        source: 'vehicles',
        filter: ['get', 'reserve'],
        paint: {
          'circle-radius': 9,
          'circle-color': crowdColor,
          'circle-stroke-color': '#f0643c',
          'circle-stroke-width': 4,
        },
      });
      map.on(
        'click',
        'stops',
        (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          const id = e.features?.[0]?.properties?.id as number | undefined;
          if (id !== undefined) handlers.current.onStopClick?.(id);
        },
      );
      map.on('mouseenter', 'stops', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'stops', () => (map.getCanvas().style.cursor = ''));
      syncVehicleVisibility();
      setReady(true);
      reportBounds();
    });
    map.on('moveend', reportBounds);
    map.on('zoomend', syncVehicleVisibility);

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource('vehicles') as GeoJSONSource | undefined;
    if (!ready || !source) return;
    source.setData({
      type: 'FeatureCollection',
      features: vehicles.map((v) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [v.lon, v.lat] },
        properties: { crowd: v.crowdLevel, reserve: v.isReserve, number: v.routeNumber },
      })),
    });
  }, [vehicles, ready]);

  useEffect(() => {
    const source = mapRef.current?.getSource('heat') as GeoJSONSource | undefined;
    if (!ready || !source) return;
    source.setData({
      type: 'FeatureCollection',
      features: (heat ?? []).map((c) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
        properties: { crowd: c.level },
      })),
    });
  }, [heat, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('lines') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: (lines ?? []).map((coordinates) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
        properties: {},
      })),
    });
    const points = (lines ?? []).flat();
    if (points.length > 1) {
      const bounds = points.reduce(
        (b, p) => b.extend(p),
        new maplibregl.LngLatBounds(points[0], points[0]),
      );
      map.fitBounds(bounds, { padding: 60, duration: 0 });
    }
  }, [lines, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource('stops') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: (stops ?? []).map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
        properties: { id: s.id, name: s.name },
      })),
    });
  }, [stops, ready]);

  return (
    <div className={`relative ${className ?? 'h-full w-full'}`}>
      <div ref={container} className="absolute inset-0" />
      {showLegend && <MapLegend />}
    </div>
  );
}

const LEGEND_LEVELS = Object.keys(CROWD_LABELS) as CrowdLevel[];

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-6 right-3 z-[1] rounded-xl bg-white/95 px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <div className="mb-1 font-semibold text-slate-700">Sıxlıq</div>
      <ul className="space-y-1">
        {LEGEND_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full ring-1 ring-white"
              style={{ backgroundColor: CROWD_COLORS[level] }}
            />
            {CROWD_LABELS[level]}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ backgroundColor: UNKNOWN_CROWD_COLOR }}
          />
          Məlum deyil
        </li>
        <li className="flex items-center gap-2 border-t border-slate-100 pt-1">
          <span className="inline-block h-3.5 w-3.5 rounded-full border-[3px] border-coral bg-white" />
          Ehtiyat avtobus
        </li>
      </ul>
    </div>
  );
}
