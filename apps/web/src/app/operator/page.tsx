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
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className="text-3xl font-extrabold tracking-tight text-[#0b2447]">{value}</div>
      {hint && <div className="mt-1 text-xs text-emerald-600">{hint}</div>}
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
    <main className="app-shell flex flex-col bg-[#f4f7fc] md:flex-row-reverse">
      <aside className="flex w-full flex-col gap-4 overflow-y-auto p-4 md:w-[430px] md:p-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">✦</span><div><h1 className="font-extrabold text-[#0b2447]">Operator paneli</h1><p className="text-xs text-slate-500">Bakı şəbəkəsi · canlı</p></div></div>
          <button onClick={logout} className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm hover:text-slate-800">Çıxış</button>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <Kpi label="Gözləyən tövsiyə" value={overview?.pendingRecommendations ?? '–'} />
          <Kpi label="Aktiv ehtiyat avtobus" value={overview?.activeReserves ?? '–'} />
          <Kpi label="Son 10 dəq. bildiriş" value={overview?.recentReports ?? '–'} />
          <Kpi label="Xəritədəki avtobus" value={vehicles.length} hint={`${reserves} ehtiyat`} />
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex-1 text-sm">
            <div className="mb-3 flex items-center justify-between"><span className="font-semibold">Demo idarəsi</span><span className="rounded-full bg-[#fff1ec] px-2 py-1 text-[10px] font-bold text-coral">SİMULYASİYA</span></div>
            <div className="mb-3 text-xs text-slate-500">Simulyasiya vaxtı: <b className="text-[#0b2447]">{overview?.clock.bakuTime ?? '–'}</b>{overview?.clock.overridden && <span className="text-coral"> · demo</span>}</div>
            <div className="flex gap-2">
              <button onClick={() => void setClock(PEAK_TIME)} className="flex-1 rounded-xl bg-coral px-3 py-2 text-xs font-bold text-white">Pik saatı göstər</button>
              <button onClick={() => void setClock(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">Normal</button>
            </div>
          </div>
        </div>
        <p className="rounded-xl bg-[#eaf1ff] px-3 py-2 text-xs text-brand">ⓘ Mövqelər, ETA və baza sıxlığı simulyasiyadır.</p>

        <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Tövsiyələr</h2><span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500 shadow-sm">{pending.length} aktiv</span></div>
        {pending.length === 0 && (
          <p className="text-sm text-slate-500">Hazırda gözləyən tövsiyə yoxdur.</p>
        )}
        {pending.map((r) => (
          <article key={r.id} className="space-y-3 rounded-2xl border-l-4 border-coral bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-extrabold">Marşrut {r.routeNumber}</span>
              <span className="rounded-full bg-[#fff1ec] px-2 py-1 text-xs font-bold text-coral">
                {r.highReports}/{r.totalReports} bildiriş
              </span>
            </div>
            <p className="text-sm text-slate-600">{r.reason}</p>
            <div className="flex gap-2">
              <button
                disabled={busyId === r.id}
                onClick={() => void resolve(r.id, 'accept')}
                className="flex-1 rounded-xl bg-brand px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                Qəbul et
              </button>
              <button
                disabled={busyId === r.id}
                onClick={() => void resolve(r.id, 'dismiss')}
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 disabled:opacity-60"
              >
                Rədd et
              </button>
            </div>
          </article>
        ))}

        {overview && overview.crowdedRoutes.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-slate-700">Ən sıx marşrutlar</h2>
            <ul className="space-y-2 text-sm">
              {overview.crowdedRoutes.map((c) => (
                <li
                  key={c.routeId}
                  className="flex justify-between rounded-xl bg-white px-3 py-3 shadow-sm"
                >
                  <span>Marşrut #{c.routeId}</span>
                  <span>{crowdLabel(c.level as never)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
      <div className="min-h-[55vh] flex-1 p-0 md:p-4">
        <BusMap vehicles={vehicles} heat={heat} onBoundsChange={setBbox} />
      </div>
    </main>
  );
}
