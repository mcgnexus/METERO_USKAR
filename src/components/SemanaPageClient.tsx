'use client';

import dynamic from 'next/dynamic';
import { NavBottom } from '@/components/NavBottom';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';

const WeekTab = dynamic(() => import('@/components/llano/week-tab').then((m) => ({ default: m.WeekTab })), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />,
});

export function SemanaPageClient({
  initialWeatherData,
  initialForecastData,
}: {
  initialWeatherData: WeatherPayload | null;
  initialForecastData: ForecastPayload | null;
}) {
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-lg px-4 pt-4" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Tendencia semanal</h1>
        </header>
        <WeekTab
          daily={initialWeatherData?.daily ?? null}
          forecast={initialForecastData}
        />
      </div>
      <NavBottom />
    </div>
  );
}
