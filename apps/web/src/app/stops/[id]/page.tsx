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
    <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full space-y-3 rounded-t-2xl bg-white p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Sıxlığı bildir</h2>
        {buses.length === 0 ? (
          <p className="text-sm text-slate-500">Bu dayanacağa yaxınlaşan avtobus yoxdur.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {buses.map((a) => (
                <button
                  key={`${a.routeId}-${a.direction}`}
                  onClick={() => setPicked(a)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    picked?.routeId === a.routeId && picked.direction === a.direction
                      ? 'bg-brand text-white'
                      : 'bg-slate-100'
                  }`}
                >
                  {a.routeNumber}
                </button>
              ))}
            </div>
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
          </>
        )}
        {message && <p className="text-sm text-brand">{message}</p>}
        <button onClick={onClose} className="w-full py-2 text-sm text-slate-500">
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
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.GET('/api/stops/{id}/arrivals', {
      params: { path: { id: stopId } },
    });
    if (data) setArrivals(data);
  }, [stopId]);

  useEffect(() => {
    const first = setTimeout(async () => {
      const { data } = await api.GET('/api/stops/{id}', { params: { path: { id: stopId } } });
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
      <h1 className="text-xl font-semibold">{stop?.name ?? 'Yüklənir…'}</h1>
      {loading && <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">Dayanacaq məlumatları yüklənir…</p>}
      {error && !missing && <p className="rounded-xl bg-white p-4 text-sm text-coral ring-1 ring-slate-200">Dayanacaq məlumatlarını yükləmək mümkün olmadı.</p>}
      {stop && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><span className="block text-xs text-slate-500">Status</span>{stop.isHub ? 'Nəqliyyat qovşağı' : 'Adi dayanacaq'}</div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><span className="block text-xs text-slate-500">Marşrutlar</span>{stop.routes.length}</div>
        </div>
      )}
      {arrivals && (
        <p className="text-xs text-slate-500">
          Simulyasiya vaxtı {arrivals.simTime}. Gəliş vaxtları simulyasiyadır.
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
