'use client';

import dynamic from 'next/dynamic';
import { NavBottom } from '@/components/NavBottom';
import { TecRuralCtaBanner } from '@/components/TecRuralCtaBanner';
import { UpdatedAtNote } from '@/components/common/UpdatedAtNote';
import { NoDataState } from '@/components/common/NoDataState';
import type { HuescarWeatherResponse } from '@/types/weather-response';

const HoursTab = dynamic(() => import('@/components/llano/hours-tab').then((m) => ({ default: m.HoursTab })), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />,
});

export function HorasPageClient({ response }: { response: HuescarWeatherResponse }) {
  const { weather: wd, forecast: fd } = response;
  const hasData = Boolean(wd?.hourly?.time?.length || fd?.forecastDays?.length);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Pronóstico por horas</h1>
          <UpdatedAtNote response={response} />
        </header>
        {hasData ? (
          <HoursTab
            hourly={wd?.hourly ?? undefined}
            forecast={fd}
            daily={wd?.daily ?? undefined}
            weather={wd}
          />
        ) : (
          <NoDataState
            title="Sin previsión horaria"
            message="El modelo de previsión no ha devuelto datos horarios en esta consulta."
          />
        )}
        <div className="mt-5">
          <TecRuralCtaBanner context="horas" />
        </div>
      </div>
      <NavBottom />
    </div>
  );
}
