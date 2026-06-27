'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { NavBottom } from '@/components/NavBottom';
import { buildAlarms } from '@/components/llano/alarms-logic';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';

const AlertsTab = dynamic(() => import('@/components/llano/alerts-tab').then((m) => ({ default: m.AlertsTab })), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />,
});

export function AlertasPageClient({
  initialClimateData,
  initialWeatherData,
}: {
  initialClimateData: ClimateCalibrationPayload | null;
  initialWeatherData: WeatherPayload | null;
}) {
  const alarms = useMemo(() => {
    if (!initialClimateData) return [];
    return buildAlarms(initialClimateData, {
      daily: initialWeatherData?.daily,
      weather: initialWeatherData,
      agricultural: initialWeatherData?.agricultural,
    });
  }, [initialClimateData, initialWeatherData]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-lg px-4 pt-4" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Alertas</h1>
        </header>
        <AlertsTab alarms={alarms} />
      </div>
      <NavBottom alertCount={alarms.length} />
    </div>
  );
}
