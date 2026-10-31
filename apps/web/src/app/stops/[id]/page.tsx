'use client';

import type { Schemas } from '@smart-transit/api-client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api, getDeviceId } from '@/lib/api';
import { CROWD_COLORS, CROWD_LABELS, type CrowdLevel, crowdLabel } from '@/lib/crowd';

type Stop = Schemas['StopDetailsDto'];
type Arrivals = Schemas['StopArrivalsDto'];
type Arrival = Schemas['ArrivalDto'];

const POLL_MS = 5000;
const LEVELS = Object.keys(CROWD_LABELS) as CrowdLevel[];

function ReportSheet({
  stop,
  arrivals,
  onClose,
}: {
  stop: Stop;
  arrivals: Arrival[];
  onClose: () => void;
}) {
  const buses = [...new Map(arrivals.map((a) => [`${a.routeId}-${a.direction}`, a])).values()];
  const [picked, setPicked] = useState<Arrival | undefined>(buses[0]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(level: CrowdLevel) {
    if (!picked) return;
    setBusy(true);
    const { response } = await api.POST('/api/reports', {
      body: {
        routeId: picked.routeId,
        direction: picked.direction as 1 | 2,
        vehicleId: picked.vehicleId,
        stopId: stop.id,
        level,
        lat: stop.lat,
        lon: stop.lon,
        deviceId: getDeviceId(),
      },
    });
    setBusy(false);
    if (response.ok) {
      setMessage('Təşəkkür edirik! Bildirişiniz qəbul olundu.');
      setTimeout(onClose, 1500);
    } else if (response.status === 429) {
      setMessage('Çox tez-tez bildirirsiniz. Bir dəqiqə gözləyin.');
    } else {
      setMessage('Bildiriş göndərilmədi. Yenidən cəhd edin.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-10 flex items-end justify-center bg-slate-950/40 md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl md:max-w-xl md:rounded-2xl md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              Avtobus bildirişi
            </p>
            <h2 className="mt-1 text-lg font-semibold">Sıxlığı bildir</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Pəncərəni bağla"
            className="rounded-full px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>
        {buses.length === 0 ? (
          <p className="text-sm text-slate-500">Bu dayanacağa yaxınlaşan avtobus yoxdur.</p>
        ) : (
          <>
            <div className="rounded-xl bg-slate-50 p-1.5">
              <p className="px-2 pb-1 text-xs text-slate-500">Avtobusu seçin</p>
              <div className="flex flex-wrap gap-1.5">
                {buses.map((a) => (
                  <button
                    key={`${a.routeId}-${a.direction}`}
                    onClick={() => setPicked(a)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                      picked?.routeId === a.routeId && picked.direction === a.direction
                        ? 'bg-brand text-white'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand'
                    }`}
                  >
                    {a.routeNumber}
                    <span className="ml-1 text-xs font-normal opacity-75">→ {a.towards}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-slate-500">Avtobus nə qədər doludur?</p>
              <div className="grid grid-cols-2 gap-2">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    disabled={busy}
                    onClick={() => void send(level)}
                    className="rounded-xl px-3 py-4 font-medium text-white disabled:opacity-60"
                    style={{ backgroundColor: CROWD_COLORS[level] }}
                  >
                    {CROWD_LABELS[level]}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        {message && <p className="text-sm text-brand">{message}</p>}
        <button
          onClick={onClose}
          className="w-full rounded-lg py-2 text-sm text-slate-500 hover:bg-slate-50"
        >
          Bağla
        </button>
      </div>
    </div>
  );
}

export default function StopPage() {
  const { id } = useParams<{ id: string }>();
  const stopId = Number(id);
  const [stop, setStop] = useState<Stop | null>(null);
  const [arrivals, setArrivals] = useState<Arrivals | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [arrivalsError, setArrivalsError] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setArrivalsError(false);
    let data;
    try {
      ({ data } = await api.GET('/api/stops/{id}/arrivals', {
        params: { path: { id: stopId } },
      }));
    } catch {
      data = undefined;
    }
    if (data) setArrivals(data);
    else setArrivalsError(true);
  }, [stopId]);

  useEffect(() => {
    const first = setTimeout(async () => {
      let data;
      try {
        ({ data } = await api.GET('/api/stops/{id}', { params: { path: { id: stopId } } }));
      } catch {
        data = undefined;
      }
      if (data) setStop(data);
      else setMissing(true);
      if (!data) setError(true);
      void load();
      setLoading(false);
    }, 0);
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [stopId, load]);

  if (missing) {
    return (
      <main className="p-6">
        <p>Dayanacaq tapılmadı.</p>
        <Link href="/" className="text-brand underline">
          Xəritəyə qayıt
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col gap-3 p-4">
      <Link href="/" className="text-sm text-brand">
        ← Xəritə
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            Dayanacaq {stop?.code ?? ''}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{stop?.name ?? 'Yüklənir…'}</h1>
        </div>
        {stop?.isHub && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand">
            Qovşaq
          </span>
        )}
      </div>
      {loading && (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
          Dayanacaq məlumatları yüklənir…
        </p>
      )}
      {error && !missing && (
        <p className="rounded-xl bg-white p-4 text-sm text-coral ring-1 ring-slate-200">
          Dayanacaq məlumatlarını yükləmək mümkün olmadı.
        </p>
      )}
      {stop && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="block text-xs text-slate-500">Status</span>
            {stop.isHub ? 'Nəqliyyat qovşağı' : 'Adi dayanacaq'}
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <span className="block text-xs text-slate-500">Marşrutlar</span>
            {stop.routes.length}
          </div>
        </div>
      )}
      {stop && stop.routes.length > 0 && (
        <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Bu dayanacaqdan keçən marşrutlar</h2>
            <span className="text-xs text-slate-500">{stop.routes.length} marşrut</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {stop.routes.map((route) => (
              <span
                key={`${route.routeId}-${route.direction}`}
                className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-brand"
              >
                {route.routeNumber}
                <span className="ml-1 font-normal text-slate-600">→ {route.towards}</span>
              </span>
            ))}
          </div>
        </section>
      )}
      {arrivals && (
        <p className="text-xs text-slate-500">
          Simulyasiya vaxtı {arrivals.simTime}. Gəliş vaxtları simulyasiyadır.
        </p>
      )}
      {arrivalsError && (
        <p className="rounded-xl bg-white p-4 text-sm text-coral ring-1 ring-slate-200">
          Gəliş məlumatlarını yeniləmək mümkün olmadı.
        </p>
      )}
      {!arrivals && !loading && !arrivalsError && (
        <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
          Gəliş məlumatları gözlənilir…
        </p>
      )}
      <ul className="space-y-2">
        {arrivals?.arrivals.length === 0 && (
          <li className="text-sm text-slate-500">Yaxınlaşan avtobus yoxdur.</li>
        )}
        {arrivals?.arrivals.map((a) => (
          <li
            key={a.vehicleId}
            className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-slate-200"
          >
            <span className="min-w-12 rounded-md bg-brand px-2 py-1 text-center font-semibold text-white">
              {a.routeNumber}
            </span>
            <div className="flex-1 text-sm">
              <div>{a.towards}</div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: a.crowdLevel ? CROWD_COLORS[a.crowdLevel] : '#64748b' }}
                />
                {crowdLabel(a.crowdLevel)}
                {a.isReserve && <b className="text-coral"> · ehtiyat avtobus</b>}
              </div>
            </div>
            <span className="text-lg font-semibold">{a.etaMin} dəq</span>
          </li>
        ))}
      </ul>
      <button
        disabled={!stop || !arrivals?.arrivals.length}
        onClick={() => setSheetOpen(true)}
        className="mt-auto rounded-xl bg-coral px-4 py-3 font-medium text-white disabled:opacity-60"
      >
        {arrivals?.arrivals.length ? 'Sıxlığı bildir' : 'Bildirmək üçün avtobus gözləyin'}
      </button>
      {sheetOpen && stop && (
        <ReportSheet
          stop={stop}
          arrivals={arrivals?.arrivals ?? []}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </main>
  );
}
