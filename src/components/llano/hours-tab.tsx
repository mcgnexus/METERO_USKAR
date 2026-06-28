'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { weatherCodeDescription, weatherEmoji } from '@/lib/display';
import { interpretTemperature, interpretRain, interpretWind, interpretWindForTreatment } from '@/lib/interpretation';
import type { HourlyWeather, DailyWeather, WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';

const TemperatureChart = dynamic(() => import('@/components/visualizacion/TemperatureChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando gráfica de temperatura" minHeightClass="h-80" />,
});
const WindTreatmentChart = dynamic(
  () => import('@/components/llano/wind-treatment-chart').then((m) => ({ default: m.WindTreatmentChart })),
  {
    ssr: false,
    loading: () => <ChartSkeleton title="Cargando gráfica de viento" minHeightClass="h-80" />,
  }
);
const Forecast5d = dynamic(() => import('@/components/llano/forecast-5d').then((m) => ({ default: m.Forecast5d })), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando pronóstico" minHeightClass="h-72" />,
});

function fmtHour(iso: string): string {
  return iso.slice(11, 16);
}

function fmtHourShort(iso: string): string {
  return iso.slice(11, 16);
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
  const [view, setView] = useState<'resumen' | 'tabla' | 'grafica'>('resumen');
  const referenceTime = weather?.current?.time ?? weather?.fetchedAt ?? null;
  const now = referenceTime ? new Date(referenceTime).getTime() : Date.now();

  const upcoming = useMemo(() => (hourly?.time ?? [])
    .map((time, index) => ({ time, index, ts: new Date(time).getTime() }))
    .filter((h) => h.ts >= now)
    .slice(0, 12), [hourly?.time, now]);

  const temps = useMemo(() => upcoming.map((h) => hourly?.temperatureC[h.index] ?? 0), [upcoming, hourly?.temperatureC]);
  const { maxTemp, minTemp, maxTempHour, rainHours, workText, treatText, rainText, firstWindLabel } = useMemo(() => {
    const max = Math.max(...temps);
    const min = Math.min(...temps);
    const maxHour = upcoming[temps.indexOf(max)];
    const rain = upcoming.filter((h) => (hourly?.precipitationProbabilityPct[h.index] ?? 0) >= 40);
    const firstHour = upcoming[0];
    const firstWind = firstHour ? hourly?.windSpeedKmh[firstHour.index] ?? 0 : 0;
    const firstWindLabelNext = interpretWind(firstWind, null).label;

    const workHours = upcoming.filter((h) => {
      const tempValue = hourly?.temperatureC[h.index] ?? 0;
      const windValue = hourly?.windSpeedKmh[h.index] ?? 0;
      return tempValue <= 30 && windValue <= 20 && (hourly?.precipitationProbabilityPct[h.index] ?? 0) < 40;
    });

    const treatOptimal = upcoming.filter((h) => {
      const windValue = hourly?.windSpeedKmh[h.index] ?? 0;
      return windValue <= 15 && (hourly?.precipitationProbabilityPct[h.index] ?? 0) < 40;
    });
    const treatApto = upcoming.filter((h) => {
      const windValue = hourly?.windSpeedKmh[h.index] ?? 0;
      return windValue <= 25 && (hourly?.precipitationProbabilityPct[h.index] ?? 0) < 40;
    });

    return {
      maxTemp: max,
      minTemp: min,
      maxTempHour: maxHour,
      rainHours: rain,
      firstWindLabel: firstWindLabelNext,
      workText: workHours.length > 0
        ? `Antes de ${fmtHour(workHours[0].time)}${workHours.length > 1 ? ` o después de ${fmtHour(workHours[workHours.length - 1].time)}` : ''}`
        : 'Evita las horas centrales si hace mucho calor o viento',
      treatText: treatOptimal.length > 0
        ? `Óptimo entre ${fmtHour(treatOptimal[0].time)} y ${fmtHour(treatOptimal[treatOptimal.length - 1].time)}`
        : treatApto.length > 0
          ? `Apto entre ${fmtHour(treatApto[0].time)} y ${fmtHour(treatApto[treatApto.length - 1].time)}`
          : 'Viento o lluvia desaconsejan tratar ahora',
      rainText: rain.length > 0
        ? `Probable sobre las ${rain.slice(0, 2).map((h) => fmtHour(h.time)).join(' y ')}`
        : 'No prevista',
    };
  }, [hourly?.precipitationProbabilityPct, hourly?.temperatureC, hourly?.windSpeedKmh, upcoming, temps]);

  if (!hourly?.time?.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-[22px] border border-slate-200 bg-white p-8">
        <p className="text-sm text-slate-700">Datos horarios no disponibles</p>
      </div>
    );
  }

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Próximas {upcoming.length} horas</h2>
        </div>

        <div className="mt-3 flex gap-2">
          <ViewButton active={view === 'resumen'} onClick={() => setView('resumen')}>Resumen</ViewButton>
          <ViewButton active={view === 'tabla'} onClick={() => setView('tabla')}>Tabla</ViewButton>
          <ViewButton active={view === 'grafica'} onClick={() => setView('grafica')}>Gráfica</ViewButton>
        </div>

        {view === 'resumen' && (
          <div className="mt-4 space-y-3">
            <div className="rounded-3xl bg-slate-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Dato principal</p>
              <p className="mt-1 text-4xl font-black text-slate-950">
                {fmtN(maxTemp, 0)}°C
              </p>
              <p className="mt-1 text-sm font-bold text-slate-700">
                Máxima prevista {maxTempHour ? `a las ${fmtHour(maxTempHour.time)}` : ''}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <SummaryChip label="Mínima" value={`${fmtN(minTemp, 0)}°C`} />
              <SummaryChip label="Lluvia" value={rainHours.length > 0 ? `${rainHours.length} horas probables` : 'Sin lluvia'} />
              <SummaryChip label="Viento ahora" value={firstWindLabel} />
            </div>

            <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-800 ring-1 ring-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Recomendación</p>
              <p className="mt-1 font-semibold text-slate-950">
                {rainHours.length > 0
                  ? `Ten a mano protección por posible lluvia sobre las ${rainHours.slice(0, 2).map(h => fmtHour(h.time)).join(' y ')}.`
                  : maxTemp >= 32
                    ? 'Prioriza tareas al aire libre temprano o al final del día.'
                    : 'Sin cambios importantes: revisa viento y temperatura antes de trabajos sensibles.'}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Detalle práctico</p>
              <ul className="mt-2 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-base">🔥</span>
                  <span><strong>Hora más calurosa:</strong> {maxTempHour ? fmtHour(maxTempHour.time) : '—'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-base">🛠️</span>
                  <span><strong>Mejor momento para trabajar:</strong> {workText}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-base">🌬️</span>
                  <span><strong>Mejor ventana para tratar:</strong> {treatText}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-base">☔</span>
                  <span><strong>Lluvia:</strong> {rainText}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {view === 'tabla' && (
          <div className="mt-4 overflow-x-auto -mx-5 px-5">
            <table className="w-full min-w-[400px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-600">
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
        )}

        {view === 'grafica' && weather && (
          <div className="mt-4 space-y-4">
            <TemperatureChart currentData={weather} />
            <WindTreatmentChart hourly={hourly} />
          </div>
        )}
      </section>

      {forecast && <Forecast5d forecast={forecast} daily={daily} />}
    </div>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
        active
          ? 'bg-slate-950 text-white shadow-sm'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ChartSkeleton({ title, minHeightClass }: { title: string; minHeightClass: string }) {
  return (
    <div className={`flex items-center justify-center rounded-[22px] border border-slate-200 bg-slate-50 ${minHeightClass}`}>
      <p className="text-sm font-medium text-slate-500">{title}...</p>
    </div>
  );
}

function fmtN(v: number, d = 1): string {
  return Number.isFinite(v) ? v.toFixed(d) : '—';
}
