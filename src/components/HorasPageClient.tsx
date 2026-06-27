'use client';

import dynamic from 'next/dynamic';
import { NavBottom } from '@/components/NavBottom';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';

const HoursTab = dynamic(() => import('@/components/llano/hours-tab').then((m) => ({ default: m.HoursTab })), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />,
});

export function HorasPageClient({
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
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Pronóstico por horas</h1>
        </header>
        <HoursTab
          hourly={initialWeatherData?.hourly ?? undefined}
          forecast={initialForecastData}
          daily={initialWeatherData?.daily ?? undefined}
          weather={initialWeatherData}
        />
      </div>
      <NavBottom />
    </div>
  );
}
