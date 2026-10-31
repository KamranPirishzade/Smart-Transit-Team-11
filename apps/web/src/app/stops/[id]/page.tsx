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
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            Bu dayanacağa yaxınlaşan avtobus yoxdur. Bildiriş göndərmək üçün canlı avtobus
            göründükdən sonra yenidən cəhd edin.
          </p>
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
      void load();
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
    <main className="app-shell mx-auto flex min-h-full max-w-lg flex-col gap-4 px-3 pb-28 pt-5">
      <Link href="/" className="w-fit text-sm font-semibold text-brand">← Xəritəyə qayıt</Link>
      <div className="space-y-1 px-1">
        {stop?.isHub && <span className="rounded-full bg-[#dce9ff] px-2.5 py-1 text-[11px] font-bold text-brand">AYNA hub</span>}
        <h1 className="mt-2 text-[30px] font-extrabold tracking-tight">{stop?.name ?? 'Yüklənir…'}</h1>
        <p className="text-sm text-slate-500">{stop ? `${stop.name} · ${stop.routes.length} marşrut` : 'Dayanacaq məlumatları yüklənir'}</p>
      </div>
      <div className="glass-card relative h-40 overflow-hidden bg-[#e9eef5]">
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(30deg, transparent 48%, #cbd5e1 49%, #cbd5e1 51%, transparent 52%), linear-gradient(120deg, transparent 48%, #d7dee8 49%, #d7dee8 51%, transparent 52%)', backgroundSize: '56px 56px' }} />
        <div className="absolute left-[33%] top-[52%] grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white shadow-lg">1</div>
        <div className="absolute left-[56%] top-[35%] grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white shadow-lg">2</div>
        <div className="absolute left-[22%] top-[28%] grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white shadow-lg">3</div>
        <span className="absolute bottom-2 right-3 rounded-full bg-white/90 px-2 py-1 text-[10px] text-slate-500">OpenFreeMap</span>
      </div>
      <div className="glass-card grid grid-cols-2 gap-4 p-5">
        <div><div className="text-lg font-bold">—</div><div className="text-xs text-slate-500">Metro yaxınlığı</div></div>
        <div><div className="text-lg font-bold">{stop?.routes.length ?? '—'}</div><div className="text-xs text-slate-500">Marşrut</div></div>
        <div><div className="text-lg font-bold">—</div><div className="text-xs text-slate-500">Skuter parkı</div></div>
        <div><div className="text-lg font-bold">—</div><div className="text-xs text-slate-500">Velosiped</div></div>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Avtobuslar</h2>
        <span className="text-xs text-slate-500">Canlı yenilənir</span>
      </div>
      <div className="glass-card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">⌾ Dayanacaq: Hamısı⌄</div>
      {arrivals && (
          <p className="border-b border-slate-100 px-4 py-2 text-[11px] text-slate-400">Simulyasiya vaxtı {arrivals.simTime} · hər 5 saniyədə yenilənir</p>
      )}
      <ul>
        {arrivals?.arrivals.length === 0 && (
          <li className="text-sm text-slate-500">Yaxınlaşan avtobus yoxdur.</li>
        )}
        {arrivals?.arrivals.map((a) => (
          <li
            key={a.vehicleId}
            className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0"
          >
            <span className="grid min-w-11 place-items-center rounded-xl bg-brand px-2 py-2 text-sm font-bold text-white">
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
            <span className="text-sm font-bold text-brand">{a.etaMin < 1 ? '<1' : a.etaMin} dəq</span>
          </li>
        ))}
      </ul>
      </div>
      <button
        disabled={!stop}
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 left-4 right-4 z-10 mx-auto max-w-lg rounded-2xl bg-coral px-4 py-3.5 font-bold text-white shadow-xl disabled:opacity-60"
      >
        Sıxlığı bildir
      </button>
      {sheetOpen && stop && (
        <ReportSheet
          stop={stop}
          arrivals={arrivals?.arrivals ?? []}
          onClose={() => setSheetOpen(false)}
        />
      )}
      <nav className="bottom-nav fixed bottom-0 left-0 right-0 z-20 mx-auto flex max-w-lg justify-center rounded-t-[26px] bg-white/95 px-3 pt-2 shadow-[0_-8px_24px_rgba(18,55,96,0.08)] md:hidden">
        <Link href="/" className="flex flex-col items-center gap-1 rounded-2xl bg-[#eaf1ff] px-8 py-2 text-[11px] font-bold text-brand"><span className="text-lg">⌁</span>Nəqliyyata qayıt</Link>
      </nav>
    </main>
  );
}
