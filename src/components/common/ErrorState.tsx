'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Estado de error reutilizable.
 *
 * El botón "Reintentar" llama a `router.refresh()` (revalida el RSC de la
 * ruta en servidor) sin recargar toda la página. Si se pasa `onRetry`,
 * se usa en su lugar (p. ej. `reset()` de un error boundary).
 */
export function ErrorState({
  title = 'No se pudo cargar la previsión',
  message = 'Los datos meteorológicos no están disponibles ahora mismo. Puede ser un fallo temporal de alguna fuente.',
  retryLabel = 'Reintentar',
  onRetry,
  fullScreen = false,
}: {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  fullScreen?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  const retry = () => {
    if (onRetry) {
      onRetry();
      return;
    }
    startTransition(() => {
      try {
        router.refresh();
      } catch {
        setFailed(true);
      }
    });
  };

  const body = (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm ${fullScreen ? '' : 'mx-auto max-w-md'}`}
    >
      <span className="text-3xl" aria-hidden="true">📡</span>
      <p className="mt-2 font-semibold text-rose-700">{title}</p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{message}</p>
      <button
        type="button"
        onClick={retry}
        disabled={isPending}
        className="mt-4 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 active:scale-95 disabled:opacity-60"
      >
        {isPending ? 'Reintentando…' : retryLabel}
      </button>
      {failed && (
        <p className="mt-3 text-xs text-slate-400">
          Si el problema continúa, prueba a recargar la página más tarde.
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4">{body}</div>;
  }
  return body;
}
