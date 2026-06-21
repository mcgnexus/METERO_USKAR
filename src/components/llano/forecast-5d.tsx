'use client';

import { dayLabel } from '@/lib/display';
import { type ForecastPayload } from '@/hooks/useForecast';
import { fmtN, KpiChip } from '@/components/llano/atoms';

export function Forecast5d({ forecast }: { forecast: ForecastPayload | null }) {
  if (!forecast?.forecastDays?.length) return null;

  const days = forecast.forecastDays;
  const totalEto = days.reduce((s, d) => s + (d.dailySummary.et0TotalMm ?? 0), 0);
  const totalRain = days.reduce((s, d) => s + (d.dailySummary.radiationTotalMJm2 !== null ? 0 : 0), 0);
  const minTemp = days.reduce((acc, d) => Math.min(acc, d.dailySummary.tempMinC ?? acc), Infinity);
  const maxTemp = days.reduce((acc, d) => Math.max(acc, d.dailySummary.tempMaxC ?? -Infinity), -Infinity);
  const bias = forecast.biasCorrection;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Pronóstico corregido</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Próximos 5 días</h2>
          <p className="mt-1 text-sm text-slate-600">
            Open-Meteo + corrección de sesgo contra el modelo local
            {bias.sampleCount > 0 && ` · ${bias.sampleCount} muestras en 30d`}
            {!Number.isFinite(minTemp) && !Number.isFinite(maxTemp) && ' · Sin bias aplicado'}.
          </p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          {Number.isFinite(minTemp) && Number.isFinite(maxTemp)
            ? `Rango ${minTemp.toFixed(0)}° / ${maxTemp.toFixed(0)}°`
            : 'Sin datos'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {days.slice(0, 5).map((d) => {
          const min = d.dailySummary.tempMinC;
          const max = d.dailySummary.tempMaxC;
          const rain = d.dailySummary.radiationTotalMJm2;
          return (
            <article key={d.date} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{dayLabel(d.date)}</p>
              <p className="mt-3 text-2xl font-black text-slate-950">
                {min !== null && max !== null ? `${min.toFixed(0)}° / ${max.toFixed(0)}°` : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Media {d.dailySummary.tempMeanC !== null ? `${d.dailySummary.tempMeanC.toFixed(1)}°C` : '—'}
              </p>
              <p className="mt-2 text-[11px] text-sky-700">💧 Lluvia: {d.dailySummary.humidityMeanPct !== null ? `${d.dailySummary.humidityMeanPct.toFixed(0)}% HR` : '—'}</p>
              <p className="text-[11px] text-slate-500">ETo: {fmtN(d.dailySummary.et0TotalMm, 1)} mm</p>
              {rain !== null && <p className="text-[10px] text-slate-400">Rs: {rain.toFixed(1)} MJ/m²</p>}
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiChip
          label="ET0 total 5d"
          value={fmtN(totalEto, 1)}
          unit="mm"
          caption="Evapotranspiración de referencia acumulada"
          tone="accent"
        />
        <KpiChip
          label="Sesgo T"
          value={`${bias.temperature.all > 0 ? '+' : ''}${bias.temperature.all.toFixed(2)}`}
          unit="°C"
          caption={`Día: ${bias.temperature.day.toFixed(2)}°C · Noche: ${bias.temperature.night.toFixed(2)}°C`}
          tone="default"
        />
        <KpiChip
          label="Sesgo HR"
          value={`${bias.humidity > 0 ? '+' : ''}${bias.humidity.toFixed(1)}`}
          unit="%"
          caption="Corrección aplicada a humedad"
        />
        <KpiChip
          label="Sesgo viento"
          value={`${bias.wind > 0 ? '+' : ''}${bias.wind.toFixed(1)}`}
          unit="km/h"
          caption="Corrección aplicada a viento"
        />
      </div>
    </section>
  );
}
