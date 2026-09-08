'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { NavBottom } from '@/components/NavBottom';
import { ErrorState } from '@/components/common/ErrorState';

/**
 * Error boundary de una ruta /huescar/*. Aísla la caída: si esta página
 * falla, el resto de la aplicación sigue funcionando. `reset` reintenta
 * el render del segmento sin recargar toda la página.
 */
export function RouteError({
  error,
  reset,
  title,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
}) {
  useEffect(() => {
    // Registro del error en logs (diagnóstico en servidor/consola).
    console.error(`[RouteError] ${title}:`, error?.message ?? error);
  }, [error, title]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">{title}</h1>
        </header>
        <ErrorState
          title={`No se pudo cargar ${title.toLowerCase()}`}
          message="Ha ocurrido un error inesperado al preparar esta página. El resto de la app sigue disponible."
          onRetry={reset}
        />
        <p className="mt-4 text-center">
          <Link href="/huescar" className="text-[11px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-800">
            ← Ir al inicio
          </Link>
        </p>
      </div>
      <NavBottom />
    </div>
  );
}
