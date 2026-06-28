'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { fmtN } from '@/components/llano/atoms';
import { dayLabel, weatherEmoji, weatherCodeDescription } from '@/lib/display';
import type { DailyWeather } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';

const Forecast5d = dynamic(() => import('@/components/llano/forecast-5d').then((m) => ({ default: m.Forecast5d })), {
  ssr: false,
  loading: () => (
    <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  ),
});

export function WeekTab({ daily, forecast }: {
  daily: DailyWeather | null;
  forecast: ForecastPayload | null;
}) {
  const [showAll, setShowAll] = useState(false);

  if (!daily || daily.time.length === 0) {
    return (
      <div className="rounded-[22px] border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-500">Pronóstico semanal no disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">📅 Pronóstico semanal</p>
        <h2 className="mt-1 text-xl font-black text-slate-900">7 días</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Temperaturas, lluvia y viento para los próximos días.</p>
      </div>

      <div className="space-y-2">
        {daily.time.slice(0, showAll ? daily.time.length : 5).map((date, i) => {
          const maxT = daily.temperatureMaxC[i];
          const minT = daily.temperatureMinC[i];
          const precip = daily.precipitationProbabilityPct[i];
          const precipMm = daily.precipitationSumMm?.[i];
          const wcode = daily.weatherCode?.[i] ?? 0;
          const gust = daily.windGustKmh?.[i];

          return (
            <div
              key={date}
              className="flex items-center gap-3 rounded-[18px] border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="min-w-[56px] text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : dayLabel(date)}
                </p>
                <p className="mt-1 text-2xl">{weatherEmoji(wcode)}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-700">{weatherCodeDescription(wcode)}</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-lg font-black text-slate-900">{fmtN(maxT, 0)}°</span>
                  <span className="text-xs text-slate-600">/ {fmtN(minT, 0)}°</span>
                  {precip !== undefined && precip > 0 && (
                    <span className="ml-auto rounded-full bg-sky-100 px-2.5 py-0.5 text-[10px] font-bold text-sky-800">
                      🌧️ {precip}%
                    </span>
                  )}
                  {gust !== undefined && gust > 40 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                      💨 {fmtN(gust, 0)}
                    </span>
                  )}
                </div>
                {precipMm !== undefined && precipMm > 0 && (
                  <p className="mt-0.5 text-[11px] text-slate-500">{fmtN(precipMm, 1)} mm esperados</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {daily.time.length > 5 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
        >
          Ver {daily.time.length - 5} días más
        </button>
      )}

      <Forecast5d forecast={forecast} daily={daily} />
    </div>
  );
}
