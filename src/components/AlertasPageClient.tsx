'use client';

import { useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { NavBottom } from '@/components/NavBottom';
import { TecRuralCtaBanner } from '@/components/TecRuralCtaBanner';
import { UpdatedAtNote } from '@/components/common/UpdatedAtNote';
import { NoDataState } from '@/components/common/NoDataState';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import type { HuescarWeatherResponse } from '@/types/weather-response';

const AlertsTab = dynamic(() => import('@/components/llano/alerts-tab').then((m) => ({ default: m.AlertsTab })), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />,
});

export function AlertasPageClient({ response }: { response: HuescarWeatherResponse }) {
  const cd = response.climate;
  const wd = response.weather;
  const alarms = useMemo(() => {
    if (!cd) return [];
    return buildAlarms(cd, {
      daily: wd?.daily,
      weather: wd,
      agricultural: wd?.agricultural,
    });
  }, [cd, wd]);
  const track = useTrackEvent();
  useEffect(() => { track('alerts_page_viewed'); }, [track]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Alertas</h1>
          <UpdatedAtNote response={response} />
        </header>
        {cd ? (
          <AlertsTab alarms={alarms} />
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
      <NavBottom alertCount={alarms.length} />
    </div>
  );
}
