'use client';

import { useState } from 'react';
import { weatherCodeDescription, weatherEmoji } from '@/lib/display';
import { interpretTemperature, interpretRain, interpretWind } from '@/lib/interpretation';
import type { HourlyWeather, DailyWeather, WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';
import { Forecast5d } from '@/components/llano/forecast-5d';
import TemperatureChart from '@/components/visualizacion/TemperatureChart';

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtHourShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function riskLabel(temp: number): string {
  if (temp >= 38) return 'Extremo';
  if (temp >= 32) return 'Alto';
  if (temp >= 28) return 'Medio';
  if (temp >= 22) return 'Bajo';
  if (temp >= 10) return 'Bajo';
  if (temp >= 5) return 'Medio';
  return 'Alto';
}

function riskColor(risk: string): string {
  switch (risk) {
    case 'Extremo': return 'bg-red-100 text-red-800';
    case 'Alto': return 'bg-orange-100 text-orange-800';
    case 'Medio': return 'bg-amber-100 text-amber-800';
    default: return 'bg-emerald-100 text-emerald-800';
  }
}

export function HoursTab({ hourly, forecast, daily, weather }: {
  hourly?: HourlyWeather;
  forecast?: ForecastPayload | null;
  daily?: DailyWeather;
  weather?: WeatherPayload | null;
}) {
  const [showChart, setShowChart] = useState(false);
  // Use the server-provided weather timestamp so SSR and hydration agree.
  const referenceTime = weather?.current?.time ?? weather?.fetchedAt ?? null;
  const now = referenceTime ? new Date(referenceTime).getTime() : Date.now();

  if (!hourly?.time?.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-[22px] border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-500">Datos horarios no disponibles</p>
      </div>
    );
  }

  const upcoming = hourly.time
    .map((time, index) => ({ time, index, ts: new Date(time).getTime() }))
    .filter((h) => h.ts >= now)
    .slice(0, 12);

  if (upcoming.length === 0) return null;

  const temps = upcoming.map(h => hourly.temperatureC[h.index] ?? 0);
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const maxTempHour = upcoming[temps.indexOf(maxTemp)];
  const rainHours = upcoming.filter(h => (hourly.precipitationProbabilityPct[h.index] ?? 0) >= 40);

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Próximas {upcoming.length} horas</h2>
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-bold text-slate-900">
              Máxima: {fmtN(maxTemp, 0)}°C {maxTempHour ? `a las ${fmtHour(maxTempHour.time)}` : ''}
            </p>
            <p className="text-slate-600">
              Mínima: {fmtN(minTemp, 0)}°C · Rango: {fmtN(maxTemp - minTemp, 0)}°C
            </p>
            {rainHours.length > 0 ? (
              <p className="mt-1 font-semibold text-sky-700">
                ☔ Lluvia probable alrededor de las {rainHours.slice(0, 3).map(h => fmtHour(h.time)).join(', ')}
              </p>
            ) : (
              <p className="mt-1 text-emerald-700">☀️ Sin lluvia prevista</p>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto -mx-5 px-5">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                <th className="py-2 text-left">Hora</th>
                <th className="py-2 text-left">Temp</th>
                <th className="py-2 text-left">Cielo</th>
                <th className="py-2 text-left">Viento</th>
                <th className="py-2 text-left">Lluvia</th>
                <th className="py-2 text-left">Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((h) => {
                const temp = hourly.temperatureC[h.index] ?? 0;
                const wc = hourly.weatherCode[h.index] ?? 0;
                const rain = hourly.precipitationProbabilityPct[h.index] ?? 0;
                const wind = hourly.windSpeedKmh[h.index] ?? 0;
                const risk = riskLabel(temp);
                const interp = interpretTemperature(temp, temp, hourly.humidityPct[h.index] ?? null, wind);
                return (
                  <tr key={h.time} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-2.5 pr-3 font-bold text-slate-800">{fmtHourShort(h.time)}</td>
                    <td className="py-2.5 pr-3 font-black tabular-nums" style={{ color: temp <= 0 ? '#60a5fa' : temp <= 15 ? '#22d3ee' : temp <= 25 ? '#34d399' : temp <= 32 ? '#fbbf24' : temp <= 38 ? '#f97316' : '#ef4444' }}>
                      {fmtN(temp, 1)}°
                    </td>
                    <td className="py-2.5 pr-3 text-slate-700">{weatherEmoji(wc)} {weatherCodeDescription(wc)}</td>
                    <td className="py-2.5 pr-3 text-slate-600">{wind.toFixed(0)} km/h</td>
                    <td className="py-2.5 pr-3 text-sky-700">{rain.toFixed(0)}%</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${riskColor(risk)}`}>
                        {risk}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setShowChart(!showChart)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
        >
          {showChart ? 'Ocultar gráfica' : 'Ver gráfica detallada'}
        </button>
      </section>

      {showChart && weather && (
        <TemperatureChart currentData={weather} />
      )}

      {forecast && <Forecast5d forecast={forecast} daily={daily} />}
    </div>
  );
}

function fmtN(v: number, d = 1): string {
  return Number.isFinite(v) ? v.toFixed(d) : '—';
}
