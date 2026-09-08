'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Estado "sin datos": la carga funcionó pero no hay información utilizable
 * (todas las fuentes vacías). Nunca deja una pantalla en blanco: explica
 * qué falta y ofrece reintentar sin recargar toda la página.
 */
export function NoDataState({
  emoji = '🌫️',
  title = 'Sin datos disponibles',
  message = 'Las fuentes meteorológicas no han devuelto datos en esta consulta. Puedes reintentar en unos segundos.',
  retryLabel = 'Reintentar',
  fullScreen = false,
}: {
  emoji?: string;
  title?: string;
  message?: string;
  retryLabel?: string;
  fullScreen?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const retry = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  const body = (
    <div className={`rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm ${fullScreen ? '' : 'mx-auto max-w-md'}`}>
      <span className="text-3xl" aria-hidden="true">{emoji}</span>
      <p className="mt-2 font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{message}</p>
      <button
        type="button"
        onClick={retry}
        disabled={isPending}
        className="mt-4 rounded-full bg-slate-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 active:scale-95 disabled:opacity-60"
      >
        {isPending ? 'Reintentando…' : retryLabel}
      </button>
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4">{body}</div>;
  }
  return body;
}
