'use client';

import * as maplibregl from 'maplibre-gl';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import { CROWD_COLORS, UNKNOWN_CROWD_COLOR } from '@/lib/crowd';
import type { Vehicle } from '@/lib/use-vehicle-stream';

export interface MapStop {
  id: number;
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  vehicles: Vehicle[];
  lines?: [number, number][][];
  stops?: MapStop[];
  onStopClick?: (id: number) => void;
  /** minLon,minLat,maxLon,maxLat of the visible area. */
  onBoundsChange?: (bbox: string) => void;
  className?: string;
}

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const BAKU: [number, number] = [49.8671, 40.4093];
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

export function BusMap({ vehicles, lines, stops, onStopClick, onBoundsChange, className }: Props) {
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
      center: BAKU,
      zoom: 11.5,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const reportBounds = () => {
      const b = map.getBounds();
      handlers.current.onBoundsChange?.(
        [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(4)).join(','),
      );
    };

    map.on('load', () => {
      map.addSource('lines', { type: 'geojson', data: EMPTY });
      map.addSource('stops', { type: 'geojson', data: EMPTY });
      map.addSource('vehicles', { type: 'geojson', data: EMPTY });
      map.addLayer({
        id: 'lines',
        type: 'line',
        source: 'lines',
        paint: { 'line-color': '#0154e2', 'line-width': 4, 'line-opacity': 0.8 },
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
        paint: {
          'circle-radius': ['case', ['get', 'reserve'], 10, 7],
          'circle-color': crowdColor,
          'circle-stroke-color': ['case', ['get', 'reserve'], '#f0643c', '#ffffff'],
          'circle-stroke-width': ['case', ['get', 'reserve'], 4, 2],
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
      setReady(true);
      reportBounds();
    });
    map.on('moveend', reportBounds);

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

  return <div ref={container} className={className ?? 'h-full w-full'} />;
}
