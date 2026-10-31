'use client';

import type { Schemas } from '@smart-transit/api-client';
import { useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BusMap, type HeatPoint } from '@/components/bus-map';
import { useToast } from '@/components/toast';
import { API_URL, api, getToken, setToken } from '@/lib/api';
import { CROWD_COLORS, type CrowdLevel, crowdLabel } from '@/lib/crowd';
import { useVehicleStream } from '@/lib/use-vehicle-stream';

type Overview = Schemas['OperatorOverviewDto'];
type Recommendation = Schemas['RecommendationDto'];
type CrowdRoute = Schemas['RouteCrowdDto'];
type Reserve = Schemas['ActiveReserveDto'];

interface FocusedRoute {
  id: number;
  number: string;
  towards: string;
  lines: [number, number][][];
}

const POLL_MS = 5000;
const PEAK_TIME = '08:15';

function bakuTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('az-AZ', {
    timeZone: 'Asia/Baku',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 ring-1 ${accent ? 'bg-coral/10 ring-coral/40' : 'bg-white ring-slate-200'}`}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold ${accent ? 'text-coral' : 'text-brand'}`}>
        {value}
      </div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {aside && <span className="text-xs text-slate-400">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export default function OperatorPage() {
  const router = useRouter();
  const { show: showToast, element: toastElement } = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [pending, setPending] = useState<Recommendation[]>([]);
  const [reserves, setReserves] = useState<Reserve[]>([]);
  const [heat, setHeat] = useState<HeatPoint[]>([]);
  const [crowdRoutes, setCrowdRoutes] = useState<CrowdRoute[]>([]);
  const [routeNumbers, setRouteNumbers] = useState<Map<number, string>>(new Map());
  const [focus, setFocus] = useState<FocusedRoute | null>(null);
  const [bbox, setBbox] = useState<string>();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  const [surgeRoute, setSurgeRoute] = useState('49');
  const [surgeBusy, setSurgeBusy] = useState(false);
  const [live, setLive] = useState(false);
  const vehicles = useVehicleStream(bbox ? { bbox } : null);
  const knownRecommendations = useRef<Set<string> | null>(null);

  const logout = useCallback(() => {
    setToken(null);
    router.replace('/operator/login');
  }, [router]);

  const numberOf = useCallback(
    (routeId: number) => routeNumbers.get(routeId) ?? `#${routeId}`,
    [routeNumbers],
  );

  const refresh = useCallback(async () => {
    try {
      const [o, r, res, h, c] = await Promise.all([
        api.GET('/api/operator/overview'),
        api.GET('/api/operator/recommendations', { params: { query: { status: 'PENDING' } } }),
        api.GET('/api/operator/reserves'),
        api.GET('/api/crowding/heatmap'),
        api.GET('/api/crowding/routes', { params: { query: { limit: 8 } } }),
      ]);
      if (o.response.status === 401 || r.response.status === 401) return logout();
      if (!o.data || !r.data || !res.data || !h.data || !c.data) {
        setError('Operator məlumatlarını yeniləmək mümkün olmadı.');
        return;
      }
      setError(null);
      setOverview(o.data);
      setPending(r.data);
      setReserves(res.data);
      setHeat(h.data.cells.map((cell) => ({ lat: cell.lat, lon: cell.lon, level: cell.level })));
      setCrowdRoutes(c.data);

      // Announce recommendations that appeared since the last refresh.
      const ids = new Set(r.data.map((rec) => rec.id));
      const known = knownRecommendations.current;
      if (known) {
        const fresh = r.data.filter((rec) => !known.has(rec.id));
        if (fresh.length > 0) {
          showToast(`Yeni tövsiyə: ${fresh[0]!.routeNumber} nömrəli marşrut`, 'info');
        }
      }
      knownRecommendations.current = ids;
    } catch {
      setError('API-yə qoşulmaq mümkün olmadı. Backend xidmətinin işlədiyini yoxlayın.');
    }
  }, [logout, showToast]);

  // Initial load + 5 s polling (the stream below makes updates near-instant).
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

  // Route numbers for the "most crowded" list (the API ranks routes by id).
  useEffect(() => {
    let cancelled = false;
    void api.GET('/api/routes', { params: { query: { limit: 250 } } }).then(({ data }) => {
      if (!cancelled && data) setRouteNumbers(new Map(data.map((r) => [r.id, r.number])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Operator SSE: overview every 2 s, dispatch events immediately.
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    const source = new EventSource(
      `${API_URL}/api/stream/operator?token=${encodeURIComponent(token)}`,
    );
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.addEventListener('overview', (event) => {
      setOverview(JSON.parse((event as MessageEvent<string>).data) as Overview);
    });
    const update = () => void refresh();
    source.addEventListener('dispatch.recommendation.created', update);
    source.addEventListener('dispatch.recommendation.resolved', update);
    source.addEventListener('dispatch.reserve.added', update);
    return () => source.close();
  }, [refresh]);

  const focusRoute = useCallback(async (routeId: number) => {
    const { data } = await api.GET('/api/routes/{id}', { params: { path: { id: routeId } } });
    if (!data) return;
    setFocus({
      id: data.id,
      number: data.number,
      towards: `${data.firstPoint ?? ''} – ${data.lastPoint ?? ''}`,
      lines: data.directions.map((d) => d.geometry as [number, number][]),
    });
  }, []);

  async function resolve(rec: Recommendation, action: 'accept' | 'dismiss') {
    setBusyId(rec.id);
    try {
      const path =
        action === 'accept'
          ? '/api/operator/recommendations/{id}/accept'
          : '/api/operator/recommendations/{id}/dismiss';
      const { response } = await api.POST(path, { params: { path: { id: rec.id } } });
      if (response.status === 401) return logout();
      if (!response.ok) {
        showToast('Tövsiyəni həll etmək mümkün olmadı.', 'error');
      } else if (action === 'accept') {
        showToast(`Ehtiyat avtobus ${rec.routeNumber} nömrəli marşruta ayrıldı`);
        await focusRoute(rec.routeId);
      } else {
        showToast(`${rec.routeNumber} nömrəli marşrut üzrə tövsiyə rədd edildi`, 'info');
      }
    } catch {
      showToast('API-yə qoşulmaq mümkün olmadı.', 'error');
    } finally {
      setBusyId(null);
      await refresh();
    }
  }

  async function setClock(time: string | null) {
    setClockBusy(true);
    try {
      const { response } = await api.PUT('/api/operator/sim-clock', {
        body: { time } as never,
      });
      if (response.status === 401) return logout();
      if (!response.ok) showToast('Simulyasiya vaxtını dəyişmək mümkün olmadı.', 'error');
      else showToast(time ? `Demo vaxtı: ${time} (pik saat)` : 'Real vaxta qayıdıldı', 'info');
    } catch {
      showToast('API-yə qoşulmaq mümkün olmadı.', 'error');
    } finally {
      setClockBusy(false);
      await refresh();
    }
  }

  async function surge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const routeNumber = surgeRoute.trim();
    if (!routeNumber) return;
    setSurgeBusy(true);
    try {
      const { data, response } = await api.POST('/api/operator/demo/surge', {
        body: { routeNumber },
      });
      if (response.status === 401) return logout();
      if (response.status === 404) {
        showToast(`${routeNumber} nömrəli marşrut tapılmadı`, 'error');
      } else if (!data) {
        showToast('Demo bildirişləri göndərilmədi.', 'error');
      } else {
        showToast(
          `${data.reports} sıx bildiriş göndərildi: marşrut ${data.routeNumber}. Tövsiyə gözlənilir…`,
          'info',
        );
        await focusRoute(data.routeId);
      }
    } catch {
      showToast('API-yə qoşulmaq mümkün olmadı.', 'error');
    } finally {
      setSurgeBusy(false);
      await refresh();
    }
  }

  const reservesOnMap = vehicles.filter((v) => v.isReserve).length;
  const highRoutes = useMemo(
    () => crowdRoutes.filter((c) => c.level === 'CROWDED' || c.level === 'FULL').length,
    [crowdRoutes],
  );

  return (
    <main className="flex h-full flex-col bg-slate-100">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
        <span className="rounded-lg bg-brand px-2 py-1 text-sm font-bold text-white">BakuFlow</span>
        <h1 className="font-semibold text-slate-800">Dispetçer paneli</h1>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Simulyasiya
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {live ? 'Canlı' : 'Bağlantı yoxdur'}
        </span>
        <span className="text-sm text-slate-700">
          <b>{overview?.clock.bakuTime ?? '–'}</b>
          {overview?.clock.overridden && <span className="ml-1 text-coral">(demo)</span>}
        </span>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-slate-800">
          Çıxış
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div className="relative min-h-[55vh] flex-1">
          <BusMap vehicles={vehicles} heat={heat} lines={focus?.lines} onBoundsChange={setBbox} />
          {focus && (
            <div className="absolute left-3 top-3 z-[1] flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-sm shadow-lg ring-1 ring-slate-200">
              <span className="rounded-md bg-brand px-2 py-0.5 font-semibold text-white">
                {focus.number}
              </span>
              <span className="text-slate-600">{focus.towards}</span>
              <button
                onClick={() => setFocus(null)}
                aria-label="Fokusu bağla"
                className="ml-1 text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          )}
        </div>

        <aside className="flex w-full flex-col gap-4 overflow-y-auto p-4 md:w-[420px]">
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <Kpi
              label="Gözləyən tövsiyə"
              value={overview?.pendingRecommendations ?? '–'}
              accent={(overview?.pendingRecommendations ?? 0) > 0}
            />
            <Kpi
              label="Aktiv ehtiyat avtobus"
              value={overview?.activeReserves ?? '–'}
              hint={`${reservesOnMap} xəritədə görünür`}
            />
            <Kpi
              label="Son 10 dəq. bildiriş"
              value={overview?.recentReports ?? '–'}
              hint={`${highRoutes} sıx marşrut`}
            />
            <Kpi label="Xəritədəki avtobus" value={vehicles.length} hint="görünən sahədə" />
          </div>

          <Section title="Tövsiyələr" aside="canlı">
            {pending.length === 0 && (
              <p className="rounded-xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-200">
                Hazırda gözləyən tövsiyə yoxdur. Aşağıdakı demo blokundan sıxlıq yaradın.
              </p>
            )}
            {pending.map((rec) => (
              <article
                key={rec.id}
                className="space-y-2 rounded-2xl bg-white p-3 shadow-sm ring-2 ring-coral"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="rounded-md bg-brand px-2 py-0.5 text-lg font-semibold text-white">
                      {rec.routeNumber}
                    </span>
                    <span className="text-sm font-semibold text-coral">Ehtiyat avtobus ayır</span>
                  </span>
                  <span className="text-xs text-slate-500">{bakuTime(rec.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600">{rec.reason}</p>
                <div className="text-xs text-slate-500">
                  {rec.highReports} yüksək / {rec.totalReports} bildiriş
                  {rec.direction ? ` · ${rec.direction}-ci istiqamət` : ''}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busyId === rec.id}
                    onClick={() => void resolve(rec, 'accept')}
                    className="flex-1 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    Qəbul et
                  </button>
                  <button
                    disabled={busyId === rec.id}
                    onClick={() => void resolve(rec, 'dismiss')}
                    className="flex-1 rounded-xl px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Rədd et
                  </button>
                  <button
                    onClick={() => void focusRoute(rec.routeId)}
                    className="rounded-xl px-3 py-2 text-sm text-brand ring-1 ring-slate-300 hover:bg-slate-50"
                  >
                    Xəritə
                  </button>
                </div>
              </article>
            ))}
          </Section>

          <Section title="Aktiv ehtiyat avtobuslar" aside={`${reserves.length} ədəd`}>
            {reserves.length === 0 && (
              <p className="rounded-xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-200">
                Ehtiyat avtobus ayrılmayıb.
              </p>
            )}
            <ul className="space-y-1.5">
              {reserves.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200"
                >
                  <span className="inline-block h-3.5 w-3.5 rounded-full border-[3px] border-coral bg-white" />
                  <span className="rounded-md bg-brand px-2 py-0.5 text-sm font-semibold text-white">
                    {r.routeNumber}
                  </span>
                  <span className="flex-1 text-xs text-slate-500">
                    {bakuTime(r.createdAt)}-da ayrılıb · {r.direction}-ci istiqamət
                  </span>
                  <button
                    onClick={() => void focusRoute(r.routeId)}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    Xəritədə göstər
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Ən sıx marşrutlar" aside="son 10 dəqiqə">
            {crowdRoutes.length === 0 && (
              <p className="rounded-xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-200">
                Son 10 dəqiqədə sərnişin bildirişi yoxdur.
              </p>
            )}
            <ul className="space-y-1.5 text-sm">
              {crowdRoutes.map((c) => (
                <li key={c.routeId}>
                  <button
                    onClick={() => void focusRoute(c.routeId)}
                    className="w-full rounded-xl bg-white p-3 text-left ring-1 ring-slate-200 hover:ring-brand"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Marşrut {numberOf(c.routeId)}</span>
                      <span
                        className="font-medium"
                        style={{ color: CROWD_COLORS[c.level as CrowdLevel] }}
                      >
                        {crowdLabel(c.level as CrowdLevel)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.round((c.score / 3) * 100))}%`,
                          backgroundColor: CROWD_COLORS[c.level as CrowdLevel],
                        }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {c.reportCount} sərnişin bildirişi
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Demo idarəsi">
            <form
              onSubmit={(e) => void surge(e)}
              className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200"
            >
              <div className="text-sm font-medium text-slate-700">Demo: sıxlıq yarat</div>
              <p className="text-xs text-slate-500">
                Seçilən marşruta 10 fərqli cihazdan “Sıx/Dolu” bildirişi göndərir. Qayda işə düşür
                və bir neçə saniyəyə tövsiyə kartı görünür.
              </p>
              <div className="flex gap-2">
                <input
                  value={surgeRoute}
                  onChange={(e) => setSurgeRoute(e.target.value)}
                  aria-label="Marşrut nömrəsi"
                  placeholder="49"
                  className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={surgeBusy}
                  className="flex-1 rounded-xl bg-coral px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {surgeBusy ? 'Göndərilir…' : 'Sıxlıq yarat'}
                </button>
              </div>
            </form>
            <div className="space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
              <div className="text-sm text-slate-700">
                Simulyasiya vaxtı: <b>{overview?.clock.bakuTime ?? '–'}</b>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={clockBusy}
                  onClick={() => void setClock(PEAK_TIME)}
                  className="flex-1 rounded-xl bg-brand px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  Pik saatı göstər
                </button>
                <button
                  disabled={clockBusy || !overview?.clock.overridden}
                  onClick={() => void setClock(null)}
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-300 disabled:opacity-50"
                >
                  Real vaxt
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Avtobus mövqeləri, ETA və baza sıxlığı simulyasiyadır. Dayanacaqlar, marşrutlar və
              sərnişin tələbi realdır (AYNA, opendata.az).
            </p>
          </Section>
        </aside>
      </div>
      {toastElement}
    </main>
  );
}
