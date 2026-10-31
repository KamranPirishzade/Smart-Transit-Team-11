'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BusMap, type HeatPoint } from '@/components/bus-map';
import { api, getToken, setToken } from '@/lib/api';
import { crowdLabel } from '@/lib/crowd';
import { useVehicleStream } from '@/lib/use-vehicle-stream';

type Overview = Schemas['OperatorOverviewDto'];
type Recommendation = Schemas['RecommendationDto'];

const POLL_MS = 5000;
const PEAK_TIME = '08:15';

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-brand">{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default function OperatorPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pending, setPending] = useState<Recommendation[]>([]);
  const [heat, setHeat] = useState<HeatPoint[]>([]);
  const [bbox, setBbox] = useState<string>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const vehicles = useVehicleStream(bbox ? { bbox } : null);

  const logout = useCallback(() => {
    setToken(null);
    router.replace('/operator/login');
  }, [router]);

  const refresh = useCallback(async () => {
    const [o, r, h] = await Promise.all([
      api.GET('/api/operator/overview'),
      api.GET('/api/operator/recommendations', { params: { query: { status: 'PENDING' } } }),
      api.GET('/api/crowding/heatmap'),
    ]);
    if (o.response.status === 401 || r.response.status === 401) return logout();
    if (o.data) setOverview(o.data);
    if (r.data) setPending(r.data);
    if (h.data) {
      setHeat(h.data.cells.map((c) => ({ lat: c.lat, lon: c.lon, level: c.level })));
    }
  }, [logout]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/operator/login');
      return;
    }
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, router]);

  async function resolve(id: string, action: 'accept' | 'dismiss') {
    setBusyId(id);
    const path =
      action === 'accept'
        ? '/api/operator/recommendations/{id}/accept'
        : '/api/operator/recommendations/{id}/dismiss';
    await api.POST(path, { params: { path: { id } } });
    setBusyId(null);
    await refresh();
  }

  async function setClock(time: string | null) {
    await api.PUT('/api/operator/sim-clock', { body: { time } as never });
    await refresh();
  }

  const reserves = vehicles.filter((v) => v.isReserve).length;

  return (
    <main className="flex h-full flex-col md:flex-row-reverse">
      <aside className="flex w-full flex-col gap-3 overflow-y-auto bg-slate-50 p-4 md:w-96">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-brand">Operator paneli</h1>
          <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800">
            Çıxış
          </button>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Gözləyən tövsiyə" value={overview?.pendingRecommendations ?? '–'} />
          <Kpi label="Aktiv ehtiyat avtobus" value={overview?.activeReserves ?? '–'} />
          <Kpi label="Son 10 dəq. bildiriş" value={overview?.recentReports ?? '–'} />
          <Kpi label="Xəritədəki avtobus" value={vehicles.length} hint={`${reserves} ehtiyat`} />
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="flex-1 text-sm">
            Simulyasiya vaxtı: <b>{overview?.clock.bakuTime ?? '–'}</b>
            {overview?.clock.overridden && <span className="text-coral"> (demo)</span>}
          </div>
          <button
            onClick={() => void setClock(PEAK_TIME)}
            className="rounded-lg bg-coral px-3 py-1.5 text-sm font-medium text-white"
          >
            Pik saatı göstər
          </button>
          <button
            onClick={() => void setClock(null)}
            className="rounded-lg px-2 py-1.5 text-sm text-slate-600 ring-1 ring-slate-300"
          >
            Normal saat
          </button>
        </div>
        <p className="text-xs text-slate-400">Simulyasiya — mövqelər və ETA real deyil.</p>

        <h2 className="text-sm font-semibold text-slate-700">Tövsiyələr</h2>
        {pending.length === 0 && (
          <p className="text-sm text-slate-500">Hazırda gözləyən tövsiyə yoxdur.</p>
        )}
        {pending.map((r) => (
          <article key={r.id} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-coral">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold">Marşrut {r.routeNumber}</span>
              <span className="text-xs text-slate-500">
                {r.highReports}/{r.totalReports} bildiriş
              </span>
            </div>
            <p className="text-sm text-slate-600">{r.reason}</p>
            <div className="flex gap-2">
              <button
                disabled={busyId === r.id}
                onClick={() => void resolve(r.id, 'accept')}
                className="flex-1 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Qəbul et
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => void resolve(r.id, 'dismiss')}
                className="flex-1 rounded-lg px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-300 disabled:opacity-60"
              >
                Rədd et
              </button>
            </div>
          </article>
        ))}

        {overview && overview.crowdedRoutes.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-700">Ən sıx marşrutlar</h2>
            <ul className="space-y-1 text-sm">
              {overview.crowdedRoutes.map((c) => (
                <li
                  key={c.routeId}
                  className="flex justify-between rounded-lg bg-white px-3 py-1.5"
                >
                  <span>Marşrut #{c.routeId}</span>
                  <span>{crowdLabel(c.level as never)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
      <div className="min-h-[50vh] flex-1">
        <BusMap vehicles={vehicles} heat={heat} onBoundsChange={setBbox} />
      </div>
    </main>
  );
}
