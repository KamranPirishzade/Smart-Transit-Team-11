'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { api, setToken } from '@/lib/api';

export default function OperatorLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const { data } = await api.POST('/api/auth/login', {
      body: { email: String(form.get('email')), password: String(form.get('password')) },
    });
    setBusy(false);
    if (!data) {
      setError('E-poçt və ya parol yanlışdır.');
      return;
    }
    setToken(data.accessToken);
    router.replace('/operator');
  }

  return (
    <main className="app-shell flex items-center justify-center bg-[#f4f7fc] p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-[28px] bg-white p-8 shadow-[0_16px_50px_rgba(18,55,96,0.12)]"
      >
        <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl text-white">✦</span><div><h1 className="text-2xl font-extrabold">Operator girişi</h1><p className="text-sm text-slate-500">Smart Transit idarəetmə paneli</p></div></div>
        <label className="block text-sm">
          E-poçt
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-2 w-full rounded-xl border-0 bg-[#f4f7fc] px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-brand"
          />
        </label>
        <label className="block text-sm">
          Parol
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border-0 bg-[#f4f7fc] px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-brand"
          />
        </label>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand px-4 py-3 font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Gözləyin…' : 'Daxil ol'}
        </button>
      </form>
    </main>
  );
}
