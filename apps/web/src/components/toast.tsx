'use client';

import { useCallback, useRef, useState } from 'react';

export type ToastTone = 'success' | 'info' | 'error';

interface ToastState {
  id: number;
  text: string;
  tone: ToastTone;
}

const TONES: Record<ToastTone, string> = {
  success: 'bg-emerald-600',
  info: 'bg-brand',
  error: 'bg-red-600',
};

/** Small transient notification: `show(text)` and render `<Toast />` once on the page. */
export function useToast(durationMs = 4000) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(
    (text: string, tone: ToastTone = 'success') => {
      clearTimeout(timer.current);
      setToast({ id: Date.now(), text, tone });
      timer.current = setTimeout(() => setToast(null), durationMs);
    },
    [durationMs],
  );

  const element = toast ? (
    <div
      key={toast.id}
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-2xl ${TONES[toast.tone]}`}
    >
      {toast.text}
    </div>
  ) : null;

  return { show, element };
}
