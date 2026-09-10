'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  ANALYTICS_CONSENT_EVENT,
  getConsentStatus,
  setConsentStatus,
  type ConsentStatus,
} from '@/lib/consent';

function subscribe(callback: () => void): () => void {
  window.addEventListener(ANALYTICS_CONSENT_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

const getServerSnapshot = (): ConsentStatus => 'unset';

/**
 * Consentimiento para la analítica de rendimiento propia (RUM: LCP, INP, CLS).
 *
 * - Sin decisión: muestra el aviso con Aceptar/Rechazar.
 * - Con decisión: deja un botón discreto para poder cambiarla en cualquier momento.
 * No se envía ninguna métrica hasta que el estado sea "granted".
 */
export function ConsentBanner() {
  const status = useSyncExternalStore(subscribe, getConsentStatus, getServerSnapshot);
  const [open, setOpen] = useState(false);

  const visible = status === 'unset' || open;

  const decide = (next: Extract<ConsentStatus, 'granted' | 'denied'>) => {
    setConsentStatus(next);
    setOpen(false);
  };

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-40 rounded-full border border-slate-300 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur hover:bg-slate-50"
        aria-label="Preferencias de analítica"
      >
        ⚙️ Analítica{status === 'granted' ? ' · activa' : ''}
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-2xl rounded-2xl border border-slate-300 bg-white p-4 shadow-lg sm:left-4 sm:right-auto"
      role="dialog"
      aria-label="Consentimiento de analítica"
    >
      <p className="text-sm font-bold text-slate-900">Analítica de rendimiento</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Medimos de forma agregada LCP, INP y CLS (velocidad y estabilidad) por ruta, municipio,
        dispositivo y tipo de conexión para mejorar el sitio. No usamos estos datos para publicidad
        ni para identificarte. Puedes aceptar o rechazar; el sitio funciona igual.{' '}
        <Link href="/cookies" className="font-semibold text-sky-700 underline">Más información</Link>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide('granted')}
          className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800"
        >
          Aceptar
        </button>
        <button
          type="button"
          onClick={() => decide('denied')}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Rechazar
        </button>
        {status !== 'unset' && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
