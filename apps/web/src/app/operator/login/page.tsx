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
    <main className="flex min-h-full items-center justify-center bg-slate-100 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-3xl bg-white p-7 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200"
      >
        <h1 className="text-xl font-semibold text-brand">Operator girişi</h1>
        <label className="block text-sm">
          E-poçt
          <input
            name="email"
            type="email"
            required
            autoComplete="username"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Parol
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-brand px-4 py-3 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {busy ? 'Gözləyin…' : 'Daxil ol'}
        </button>
      </form>
    </main>
  );
}
