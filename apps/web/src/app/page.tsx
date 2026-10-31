'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BusMap, type MapStop } from '@/components/bus-map';
import { api } from '@/lib/api';
import { useVehicleStream } from '@/lib/use-vehicle-stream';

type RouteSummary = Schemas['RouteSummaryDto'];
type RouteDetails = Schemas['RouteDetailsDto'];

const SEARCH_DELAY_MS = 250;
/** 28 May metro area — used when the browser has no geolocation. */
const FALLBACK = { lat: 40.3777, lon: 49.8531 };

export default function HomePage() {
  const router = useRouter();
  const [results, setResults] = useState<RouteSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<RouteDetails | null>(null);
  const [nearby, setNearby] = useState<MapStop[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(true);
  const [nearbyError, setNearbyError] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const vehicles = useVehicleStream(selected ? { routeId: selected.id } : null);

  useEffect(() => {
    let cancelled = false;
    async function load(lat: number, lon: number) {
      setNearbyLoading(true);
      setNearbyError(false);
      const { data } = await api.GET('/api/stops/nearby', {
        params: { query: { lat, lon, radius: 600, limit: 12 } },
      });
      if (!cancelled) {
        setNearbyLoading(false);
        if (data) {
          setNearby(data.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon })));
        } else {
          setNearbyError(true);
        }
      }
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => void load(pos.coords.latitude, pos.coords.longitude),
        () => void load(FALLBACK.lat, FALLBACK.lon),
        { timeout: 4000 },
      );
    } else {
      void load(FALLBACK.lat, FALLBACK.lon);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function onSearch(value: string) {
    clearTimeout(timer.current);
    const query = value.trim();
    if (!query) {
      setResults([]);
      setSearched(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(false);
      const { data } = await api.GET('/api/routes', { params: { query: { query, limit: 8 } } });
      setSearchLoading(false);
      if (data) {
        setResults(data);
        setSearched(true);
      } else {
        setResults([]);
        setSearchError(true);
        setSearched(false);
      }
    }, SEARCH_DELAY_MS);
  }

  async function select(route: RouteSummary) {
    if (!route.hasStops) return;
    setRouteLoading(true);
    setRouteError(false);
    const { data } = await api.GET('/api/routes/{id}', { params: { path: { id: route.id } } });
    setRouteLoading(false);
    if (data) {
      setSelected(data);
      setResults([]);
      setSearched(false);
    } else {
      setRouteError(true);
    }
  }

  const lines = useMemo(
    () => selected?.directions.map((d) => d.geometry as [number, number][]),
    [selected],
  );
  const stops = useMemo<MapStop[]>(() => {
    if (!selected) return nearby;
    const unique = new Map<number, MapStop>();
    for (const direction of selected.directions) {
      for (const s of direction.stops) {
        unique.set(s.stopId, { id: s.stopId, name: s.name, lat: s.lat, lon: s.lon });
      }
    }
    return [...unique.values()];
  }, [selected, nearby]);

  return (
    <main className="relative h-full">
      <BusMap
        vehicles={vehicles}
        lines={lines}
        stops={stops}
        onStopClick={(id) => router.push(`/stops/${id}`)}
      />
      <section className="absolute left-3 right-3 top-3 max-w-md space-y-2 md:left-5 md:top-5 md:right-auto">
        <input
          type="search"
          placeholder="Marşrut nömrəsi və ya son dayanacaq"
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Marşrut axtarışı"
          className="w-full rounded-2xl bg-white px-4 py-3.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 focus:outline-brand"
        />
        {searchLoading && <p className="rounded-xl bg-white px-4 py-2 text-sm text-slate-500 shadow-md">Axtarılır…</p>}
        {searchError && <p className="rounded-xl bg-white px-4 py-2 text-sm text-coral shadow-md">Marşrutları yükləmək mümkün olmadı.</p>}
        {(results.length > 0 || searched) && (
          <ul className="max-h-72 overflow-y-auto rounded-xl bg-white shadow-md ring-1 ring-slate-200">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">Marşrut tapılmadı.</li>
            )}
            {results.some((r) => !r.hasStops) && (
              <li className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                Dayanacaq məlumatı olmayan marşrutlar seçilə bilməz.
              </li>
            )}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  disabled={!r.hasStops || routeLoading}
                  onClick={() => void select(r)}
                  className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-12 rounded-md bg-brand px-2 py-1 text-center font-semibold text-white">
                    {r.number}
                  </span>
                  <span className="text-sm">
                    {r.firstPoint} – {r.lastPoint}
                    {!r.hasStops && (
                      <em className="block text-xs text-coral">Dayanacaq məlumatı yoxdur</em>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {routeLoading && <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500 shadow-md">Marşrut yüklənir…</p>}
        {routeError && <p className="rounded-xl bg-white px-4 py-3 text-sm text-coral shadow-md">Marşrut məlumatı yüklənmədi.</p>}
        {selected && (
          <div className="rounded-xl bg-white px-4 py-3 shadow-md ring-1 ring-slate-200">
            <div className="font-semibold text-brand">Marşrut {selected.number}</div>
            <div className="text-sm text-slate-600">
              {selected.firstPoint} – {selected.lastPoint} · {vehicles.length} avtobus xətdədir
            </div>
            <div className="text-xs text-slate-500">
              Gediş vaxtı simulyasiyadır. Gəlişi görmək üçün dayanacağa toxunun.
            </div>
          </div>
        )}
        {!selected && !searched && (
          <div className="rounded-2xl bg-white/95 p-4 shadow-lg shadow-slate-900/10 ring-1 ring-slate-200">
            <div className="text-sm font-semibold text-brand">Yaxın dayanacaqlar</div>
            {nearbyLoading && <p className="mt-2 text-sm text-slate-500">Dayanacaqlar yüklənir…</p>}
            {nearbyError && <p className="mt-2 text-sm text-coral">Yaxın dayanacaqları yükləmək mümkün olmadı.</p>}
            {!nearbyLoading && !nearbyError && nearby.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">Yaxınlıqda dayanacaq tapılmadı.</p>
            )}
            <div className="mt-2 grid gap-1">
              {nearby.slice(0, 5).map((stop) => (
                <button key={stop.id} onClick={() => router.push(`/stops/${stop.id}`)} className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-100">
                  <span>{stop.name}</span><span className="text-brand">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
