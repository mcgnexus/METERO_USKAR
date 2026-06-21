'use client';

import { weatherCodeDescription, weatherEmoji } from '@/lib/display';
import type { HourlyWeather } from '@/types/weather';

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function Forecast24h({ hourly, count = 24 }: { hourly?: HourlyWeather; count?: number }) {
  if (!hourly?.time?.length) return null;
  const now = Date.now();
  const upcoming = hourly.time
    .map((time, index) => ({ time, index, ts: new Date(time).getTime() }))
    .filter((h) => h.ts >= now)
    .slice(0, count);

  if (upcoming.length === 0) return null;

  return (
    <section id="proximas-24h" className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Próximas horas</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Detalle de las próximas {upcoming.length} horas</h2>
          <p className="mt-1 text-sm text-slate-600">Temperatura, lluvia, humedad y viento hora a hora.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {upcoming.map((h) => {
          const temp = hourly.temperatureC[h.index];
          const wcode = hourly.weatherCode[h.index] ?? 0;
          const rain = hourly.precipitationProbabilityPct[h.index] ?? 0;
          const wind = hourly.windSpeedKmh[h.index] ?? 0;
          const hum = hourly.humidityPct[h.index] ?? 0;
          return (
            <article key={h.time} className="rounded-[18px] border border-slate-100 bg-slate-50 p-3 text-center">
              <p className="text-xs font-bold text-slate-700">{fmtHour(h.time)}</p>
              <p className="mt-2 text-3xl">{weatherEmoji(wcode)}</p>
              <p className="mt-1 text-[10px] leading-3 text-slate-500">{weatherCodeDescription(wcode)}</p>
              <p className="mt-2 text-xl font-black text-slate-950">{(temp ?? 0).toFixed(1)}°</p>
              <p className="mt-1 text-[11px] text-sky-700">💧 {rain.toFixed(0)}%</p>
              <p className="text-[11px] text-sky-600">💦 {hum.toFixed(0)}% HR</p>
              <p className="text-[11px] text-slate-500">💨 {wind.toFixed(0)} km/h</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
