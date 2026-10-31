'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BusMap, type MapStop } from '@/components/bus-map';
import { api } from '@/lib/api';
import { useVehicleStream } from '@/lib/use-vehicle-stream';
import Link from 'next/link';

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
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const vehicles = useVehicleStream(selected ? { routeId: selected.id } : null);

  useEffect(() => {
    let cancelled = false;
    async function load(lat: number, lon: number) {
      const { data } = await api.GET('/api/stops/nearby', {
        params: { query: { lat, lon, radius: 600, limit: 12 } },
      });
      if (!cancelled && data) {
        setNearby(data.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon })));
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
      const { data } = await api.GET('/api/routes', { params: { query: { query, limit: 8 } } });
      setResults(data ?? []);
      setSearched(true);
    }, SEARCH_DELAY_MS);
  }

  async function select(route: RouteSummary) {
    if (!route.hasStops) return;
    const { data } = await api.GET('/api/routes/{id}', { params: { path: { id: route.id } } });
    if (data) {
      setSelected(data);
      setResults([]);
      setSearched(false);
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
    <main className="app-shell relative">
      <BusMap
        vehicles={vehicles}
        lines={lines}
        stops={stops}
        onStopClick={(id) => router.push(`/stops/${id}`)}
        className="fixed inset-0 h-dvh w-full"
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#f4f7fc]/90 via-transparent to-transparent md:from-transparent" />
      <header className="pointer-events-none fixed left-0 right-0 top-0 z-10 flex items-center justify-between p-4 md:p-6">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/95 px-3 py-2 shadow-lg">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-lg text-white">✦</div>
          <div>
            <div className="text-sm font-extrabold tracking-tight">Smart Transit</div>
            <div className="text-[10px] text-slate-500">Bakı avtobusları</div>
          </div>
        </div>
        <Link href="/profile" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white text-brand shadow-lg" aria-label="Profil">
          <span className="text-lg">S</span>
        </Link>
      </header>
      <section className="pointer-events-none fixed left-3 right-3 top-[88px] z-10 mx-auto max-w-xl space-y-3 md:left-8 md:right-auto md:top-24 md:mx-0">
        <div className="pointer-events-auto rounded-[24px] bg-white p-3 shadow-xl ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-xl text-brand">⌕</span>
        <input
          type="search"
              placeholder="Marşrut və ya dayanacaq axtar"
          onChange={(e) => onSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
            <span className="rounded-full bg-[#eef4ff] px-2 py-1 text-[10px] font-semibold text-brand">GPS</span>
          </div>
        </div>
        {(results.length > 0 || searched) && (
          <ul className="pointer-events-auto max-h-72 overflow-y-auto rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-100">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">Marşrut tapılmadı.</li>
            )}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  disabled={!r.hasStops}
                  onClick={() => void select(r)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-[#f4f7fc] disabled:cursor-not-allowed disabled:opacity-50"
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
        {selected && (
          <div className="pointer-events-auto rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-slate-100">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-brand px-2.5 py-1 font-bold text-white">{selected.number}</span>
              <div className="font-semibold">Marşrut aktivdir</div>
            </div>
            <div className="text-sm text-slate-600">
              {selected.firstPoint} – {selected.lastPoint} · {vehicles.length} avtobus xətdədir
            </div>
            <div className="text-xs text-slate-500">
              Gediş vaxtı simulyasiyadır. Gəlişi görmək üçün dayanacağa toxunun.
            </div>
          </div>
        )}
      </section>
      <div className="pointer-events-auto fixed bottom-4 left-3 right-3 z-10 mx-auto flex max-w-md items-center justify-around rounded-[28px] bg-white/95 p-2 shadow-xl ring-1 ring-slate-200 md:hidden">
        <Link href="/" className="flex flex-col items-center gap-1 rounded-2xl bg-[#eaf1ff] px-5 py-2 text-[11px] font-bold text-brand"><span className="text-lg">⌁</span>Nəqliyyat</Link>
        <Link href="/profile" className="flex flex-col items-center gap-1 px-5 py-2 text-[11px] text-slate-500"><span className="text-lg">♙</span>Profil</Link>
      </div>
    </main>
  );
}
