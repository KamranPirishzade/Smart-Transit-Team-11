'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { BusMap, type MapStop } from '@/components/bus-map';
import { api } from '@/lib/api';
import { useVehicleStream } from '@/lib/use-vehicle-stream';

type RouteSummary = Schemas['RouteSummaryDto'];
type RouteDetails = Schemas['RouteDetailsDto'];

const SEARCH_DELAY_MS = 250;

export default function HomePage() {
  const router = useRouter();
  const [results, setResults] = useState<RouteSummary[]>([]);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<RouteDetails | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const vehicles = useVehicleStream(selected ? { routeId: selected.id } : null);

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
  const stops = useMemo<MapStop[] | undefined>(() => {
    if (!selected) return undefined;
    const unique = new Map<number, MapStop>();
    for (const direction of selected.directions) {
      for (const s of direction.stops) {
        unique.set(s.stopId, { id: s.stopId, name: s.name, lat: s.lat, lon: s.lon });
      }
    }
    return [...unique.values()];
  }, [selected]);

  return (
    <main className="relative h-full">
      <BusMap
        vehicles={vehicles}
        lines={lines}
        stops={stops}
        onStopClick={(id) => router.push(`/stops/${id}`)}
      />
      <section className="absolute left-3 right-3 top-3 max-w-md space-y-2 md:right-auto">
        <input
          type="search"
          placeholder="Marşrut nömrəsi və ya son dayanacaq"
          onChange={(e) => onSearch(e.target.value)}
          className="w-full rounded-xl bg-white px-4 py-3 shadow-md ring-1 ring-slate-200 focus:outline-brand"
        />
        {(results.length > 0 || searched) && (
          <ul className="max-h-72 overflow-y-auto rounded-xl bg-white shadow-md ring-1 ring-slate-200">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500">Marşrut tapılmadı.</li>
            )}
            {results.map((r) => (
              <li key={r.id}>
                <button
                  disabled={!r.hasStops}
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
      </section>
    </main>
  );
}
