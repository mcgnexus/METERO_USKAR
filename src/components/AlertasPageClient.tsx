'use client';

import { useEffect, useMemo } from 'react';
import { NavBottom } from '@/components/NavBottom';
import { TecRuralCtaBanner } from '@/components/TecRuralCtaBanner';
import { UpdatedAtNote } from '@/components/common/UpdatedAtNote';
import { NoDataState } from '@/components/common/NoDataState';
import { AlertsSections } from '@/components/alerts/AlertsSections';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import type { HuescarWeatherResponse } from '@/types/weather-response';

export function AlertasPageClient({ response }: { response: HuescarWeatherResponse }) {
  const track = useTrackEvent();
  useEffect(() => { track('alerts_page_viewed'); }, [track]);

  // Conteo SOLO meteorológico para el badge de navegación: no mezcla categorías.
  const weatherAlertCount = useMemo(() => {
    if (!response.climate) return 0;
    return buildAlarms(response.climate, {
      daily: response.weather?.daily,
      weather: response.weather,
      agricultural: response.weather?.agricultural,
    }).length;
  }, [response]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Alertas</h1>
          <p className="mt-1 text-xs text-slate-500">Meteorológicas, fitosanitarias y recomendaciones agrícolas, por separado.</p>
          <UpdatedAtNote response={response} />
        </header>
        {response.climate ? (
          <AlertsSections response={response} />
        ) : (
          <NoDataState
            emoji="⚠️"
            title="Avisos no disponibles"
            message="No hay datos suficientes para evaluar los umbrales de aviso en esta consulta. No se puede confirmar que esté todo en calma."
          />
        )}
        <div className="mt-5">
          <TecRuralCtaBanner context="alertas" />
        </div>
      </div>
      <NavBottom weatherAlertCount={weatherAlertCount} />
    </div>
  );
}
