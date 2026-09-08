'use client';

import type { HuescarWeatherResponse } from '@/types/weather-response';

/**
 * Marca de actualización común a todas las pantallas. Muestra la misma hora
 * (Europe/Madrid) y el mismo modelo/fuente para toda la carga, tomados del
 * contrato único generado por el servidor.
 */
export function UpdatedAtNote({ response }: { response: HuescarWeatherResponse }) {
  const hasData = Boolean(response.climate || response.weather || response.forecast);
  if (!hasData) return null;

  return (
    <p className="mt-1 text-[11px] leading-5 text-slate-500">
      <span className="inline-flex items-center gap-1">
        <span aria-hidden="true">🕐</span> {response.updatedAtLabel}
      </span>
      {response.model ? <span className="text-slate-400"> · {response.model}</span> : null}
    </p>
  );
}
