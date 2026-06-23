'use client';

import { useState } from 'react';
import { weatherCodeDescription, weatherEmoji } from '@/lib/display';
import type { HourlyWeather } from '@/types/weather';

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function Forecast24h({ hourly, count = 8 }: { hourly?: HourlyWeather; count?: number }) {
  const [now] = useState(() => Date.now());

  if (!hourly?.time?.length) return null;

  const upcoming = hourly.time
    .map((time, index) => ({ time, index, ts: new Date(time).getTime() }))
    .filter((hour) => hour.ts >= now)
    .slice(0, count);

  if (upcoming.length === 0) return null;

  return (
    <section id="proximas-24h" className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">PrÃ³ximas horas</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Detalle de las prÃ³ximas {upcoming.length} horas</h2>
          <p className="mt-1 text-sm text-slate-600">Temperatura, lluvia, humedad y viento hora a hora.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {upcoming.map((hour) => {
          const temp = hourly.temperatureC[hour.index];
          const weatherCode = hourly.weatherCode[hour.index] ?? 0;
          const rain = hourly.precipitationProbabilityPct[hour.index] ?? 0;
          const wind = hourly.windSpeedKmh[hour.index] ?? 0;
          const humidity = hourly.humidityPct[hour.index] ?? 0;
          return (
            <article key={hour.time} className="rounded-[18px] border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xs font-bold text-slate-700">{fmtHour(hour.time)}</p>
              <p className="mt-2 text-3xl">{weatherEmoji(weatherCode)}</p>
              <p className="mt-1 text-[10px] leading-3 text-slate-500">{weatherCodeDescription(weatherCode)}</p>
              <p className="mt-2 text-xl font-black text-slate-950">{(temp ?? 0).toFixed(1)}Â°</p>
              <p className="mt-1 text-[11px] text-sky-700">ðŸ’§ {rain.toFixed(0)}%</p>
              <p className="text-[11px] text-sky-800">ðŸ’¦ {humidity.toFixed(0)}% HR</p>
              <p className="text-[11px] text-slate-500">ðŸ’¨ {wind.toFixed(0)} km/h</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
