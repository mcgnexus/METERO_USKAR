'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { dayLabel, weatherCodeDescription, weatherEmoji } from '@/lib/display';
import { type ForecastPayload } from '@/hooks/useForecast';
import { type DailyWeather } from '@/types/weather';
import { fmtN } from '@/components/llano/atoms';

interface ForecastDetail {
  title: string;
  subtitle: string;
  tone: 'emerald' | 'sky' | 'amber' | 'slate';
  headline: string;
  metrics: { label: string; value: string; tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' }[];
  sections: { title: string; body: string; emphasis?: string }[];
}

function toneClasses(tone: ForecastDetail['tone']): string {
  if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50';
  if (tone === 'sky') return 'border-sky-200 bg-sky-50';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50';
  return 'border-slate-200 bg-slate-50';
}

function metricTone(tone: ForecastDetail['metrics'][number]['tone']): string {
  if (tone === 'emerald') return 'bg-emerald-100 text-emerald-900';
  if (tone === 'sky') return 'bg-sky-100 text-sky-900';
  if (tone === 'amber') return 'bg-amber-100 text-amber-900';
  if (tone === 'rose') return 'bg-rose-100 text-rose-900';
  return 'bg-white text-slate-900';
}

function ForecastModal({ detail, onClose }: { detail: ForecastDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border p-6 shadow-2xl ${toneClasses(detail.tone)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Próximos 5 días</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{detail.title}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">{detail.subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/80 px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-white"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">Lectura rápida</p>
          <p className="mt-2 text-3xl font-black leading-tight">{detail.headline}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {detail.metrics.map((m) => (
            <div key={m.label} className={`rounded-2xl p-3 shadow-sm ${metricTone(m.tone)}`}>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60">{m.label}</p>
              <p className="mt-1 text-xl font-black tabular-nums">{m.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {detail.sections.map((section) => (
            <section key={section.title} className="rounded-2xl bg-white/85 p-4 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{section.title}</h3>
              {section.emphasis && <p className="mt-2 text-lg font-black text-slate-950">{section.emphasis}</p>}
              <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForecastClickable({ detail, onOpen, children }: {
  detail: ForecastDetail;
  onOpen: (detail: ForecastDetail) => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="block w-full text-left" onClick={() => onOpen(detail)}>
      <div className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
        {children}
      </div>
    </button>
  );
}

function ForecastMetricCard({ label, value, unit, caption, tone = 'slate' }: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  tone?: 'sky' | 'amber' | 'slate';
}) {
  const toneClass = tone === 'sky'
    ? 'border-sky-100 bg-sky-50/80 text-sky-950'
    : tone === 'amber'
      ? 'border-amber-100 bg-amber-50/80 text-amber-950'
      : 'border-slate-100 bg-white/85 text-slate-950';

  return (
    <article className={`h-full rounded-[20px] border p-3.5 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-black leading-none tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs font-bold text-slate-600">{unit}</span>}
      </p>
      <p className="mt-2 text-xs font-semibold leading-4 text-slate-600">{caption}</p>
    </article>
  );
}

function formatSigned(value: number, digits: number, unit = ''): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${unit}`;
}

export function Forecast5d({ forecast, daily }: { forecast: ForecastPayload | null; daily?: DailyWeather }) {
  const [expandedDetail, setExpandedDetail] = useState<ForecastDetail | null>(null);

  if (!forecast?.forecastDays?.length) return null;

  const days = forecast.forecastDays;
  const totalEto = days.reduce((s, d) => s + (d.dailySummary.et0TotalMm ?? 0), 0);
  const minTemp = days.reduce((acc, d) => Math.min(acc, d.dailySummary.tempMinC ?? acc), Infinity);
  const maxTemp = days.reduce((acc, d) => Math.max(acc, d.dailySummary.tempMaxC ?? -Infinity), -Infinity);
  const bias = forecast.biasCorrection;

  function dailyDataFor(dateStr: string) {
    if (!daily) return null;
    const idx = daily.time.findIndex((t) => t.slice(0, 10) === dateStr.slice(0, 10));
    if (idx === -1) return null;
    return {
      precipProb: daily.precipitationProbabilityPct[idx] ?? null,
      precipMm: daily.precipitationSumMm[idx] ?? null,
      windGust: daily.windGustKmh[idx] ?? null,
      weatherCode: daily.weatherCode[idx] ?? null,
    };
  }

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

      <div className="mt-5 flex gap-2.5 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 sm:overflow-visible">
        {days.slice(0, 5).map((d) => {
          const min = d.dailySummary.tempMinC;
          const max = d.dailySummary.tempMaxC;
          const dd = dailyDataFor(d.date);
          const wCode = dd?.weatherCode ?? null;
          const precipProb = dd?.precipProb ?? null;
          const windGust = dd?.windGust ?? null;
          const precipMm = dd?.precipMm ?? null;
          const detail: ForecastDetail = {
            title: dayLabel(d.date),
            subtitle: new Date(d.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
            tone: (d.dailySummary.et0TotalMm ?? 0) >= 5 ? 'amber' : 'emerald',
            headline: min !== null && max !== null
              ? `${min.toFixed(0)}°C mínima / ${max.toFixed(0)}°C máxima`
              : 'Temperatura no disponible',
            metrics: [
              { label: 'Media térmica', value: d.dailySummary.tempMeanC !== null ? `${d.dailySummary.tempMeanC.toFixed(1)}°C` : 'Sin dato', tone: 'slate' },
              { label: 'Amplitud', value: min !== null && max !== null ? `${(max - min).toFixed(1)}°C` : 'Sin dato', tone: min !== null && max !== null && max - min >= 25 ? 'amber' : 'slate' },
              { label: 'HR media', value: d.dailySummary.humidityMeanPct !== null ? `${d.dailySummary.humidityMeanPct.toFixed(0)}%` : 'Sin dato', tone: 'sky' },
              { label: 'Viento medio', value: d.dailySummary.windMeanKmh !== null ? `${d.dailySummary.windMeanKmh.toFixed(1)} km/h` : 'Sin dato', tone: 'slate' },
              { label: 'Rachas máx', value: windGust !== null ? `${windGust.toFixed(0)} km/h` : 'Sin dato', tone: windGust !== null && windGust >= 60 ? 'rose' : 'slate' },
              { label: 'Prob. lluvia', value: precipProb !== null ? `${precipProb.toFixed(0)}%` : 'Sin dato', tone: precipProb !== null && precipProb >= 50 ? 'sky' : 'slate' },
              { label: 'Lluvia', value: precipMm !== null ? `${precipMm.toFixed(1)} mm` : 'Sin dato', tone: 'sky' },
              { label: 'ET0', value: `${fmtN(d.dailySummary.et0TotalMm, 1)} mm`, tone: (d.dailySummary.et0TotalMm ?? 0) >= 5 ? 'amber' : 'emerald' },
              { label: 'Radiación', value: d.dailySummary.radiationTotalMJm2 !== null ? `${d.dailySummary.radiationTotalMJm2.toFixed(1)} MJ/m²` : 'Sin dato', tone: 'sky' },
            ],
            sections: [
              {
                title: 'Tiempo esperado',
                emphasis: wCode !== null ? `${weatherEmoji(wCode)} ${weatherCodeDescription(wCode)}` : 'Sin código meteorológico',
                body: wCode !== null
                  ? weatherCodeDescription(wCode)
                  : 'No hay código WMO disponible para este día.',
              },
              {
                title: 'Interpretación agronómica',
                emphasis: (d.dailySummary.et0TotalMm ?? 0) >= 5 ? 'Demanda hídrica alta' : 'Demanda hídrica moderada o baja',
                body: 'La ET0 resume la demanda atmosférica. Si coincide con radiación alta, viento o humedad baja, conviene revisar humedad del suelo y ajustar riego por Kc del cultivo.',
              },
              {
                title: 'Riesgo térmico',
                emphasis: min !== null && max !== null && max - min >= 25 ? 'Día con mucha oscilación térmica' : 'Oscilación térmica contenida',
                body: min !== null && max !== null && max - min >= 25
                  ? 'Una amplitud alta puede combinar frío nocturno con estrés diurno. Vigilar cultivos recién trasplantados, floración y animales en exterior.'
                  : 'No se detecta una amplitud extrema. Aun así, revisar mínima si hay cultivos sensibles o zonas bajas con inversión térmica.',
              },
              {
                title: 'Viento y lluvia',
                emphasis: windGust !== null && windGust >= 60 ? `Rachas de ${windGust.toFixed(0)} km/h` : precipProb !== null && precipProb >= 50 ? `Probabilidad de lluvia ${precipProb.toFixed(0)}%` : 'Sin riesgo eólico o de precipitación destacable',
                body: `${windGust !== null ? `Rachas máximas previstas: ${windGust.toFixed(0)} km/h. ` : ''}${precipProb !== null ? `Probabilidad de precipitación: ${precipProb.toFixed(0)}%. ` : ''}${precipMm !== null ? `Acumulado previsto: ${precipMm.toFixed(1)} mm.` : ''} El viento fuerte puede afectar tratamientos, el viento moderado aumenta ETo y la lluvia reduce necesidad de riego.`,
              },
              {
                title: 'Suelo',
                emphasis: `10 cm: ${fmtN(d.dailySummary.soilTemp10cmMeanC, 1)}°C · 40 cm: ${fmtN(d.dailySummary.soilTemp40cmMeanC, 1)}°C`,
                body: 'La capa de 10 cm responde rápido y afecta siembra/trasplante. La de 40 cm cambia más lento y marca reserva térmica del perfil.',
              },
              {
                title: 'Fiabilidad',
                emphasis: `${bias.sampleCount} muestras usadas para la corrección`,
                body: 'Este pronóstico parte de Open-Meteo y aplica corrección de sesgo contra el modelo local. Más muestras recientes implican mejor ajuste estadístico.',
              },
            ],
          };
          return (
            <ForecastClickable key={d.date} detail={detail} onOpen={setExpandedDetail}>
              <article className="flex w-[110px] shrink-0 flex-col items-center rounded-[20px] border border-slate-100 bg-slate-50 p-3 text-center sm:w-full">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{dayLabel(d.date)}</p>
                {wCode !== null && (
                  <p className="mt-1 text-[1.6rem] leading-none">{weatherEmoji(wCode)}</p>
                )}
                <p className="mt-1 text-lg font-black leading-tight text-slate-950">
                  {min !== null && max !== null ? `${min.toFixed(0)}° / ${max.toFixed(0)}°` : '—'}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-[11px] font-bold text-sky-700">💧 {precipProb !== null ? `${precipProb.toFixed(0)}%` : '—'}</p>
                  <p className="text-[11px] font-bold text-slate-500">💨 {windGust !== null ? `${windGust.toFixed(0)}` : '—'}</p>
                </div>
              </article>
            </ForecastClickable>
          );
        })}
      </div>

      <div className="mt-5 rounded-[24px] border border-slate-100 bg-white/65 p-3.5 sm:p-4">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Ajustes del periodo</p>
            <p className="text-sm font-bold text-slate-700">Correcciones usadas para afinar el pronóstico local</p>
          </div>
          <p className="text-xs font-bold text-slate-500">Toca cualquier métrica para ver el detalle</p>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <ForecastClickable
          onOpen={setExpandedDetail}
          detail={{
            title: 'ET0 total 5 días',
            subtitle: 'Evapotranspiración acumulada del periodo',
            tone: totalEto >= 20 ? 'amber' : 'sky',
            headline: `${fmtN(totalEto, 1)} mm de demanda atmosférica`,
            metrics: [{ label: 'ET0 acumulada', value: `${fmtN(totalEto, 1)} mm`, tone: totalEto >= 20 ? 'amber' : 'sky' }],
            sections: [
              { title: 'Qué significa', emphasis: totalEto >= 20 ? 'Demanda alta en 5 días' : 'Demanda contenida', body: 'Suma la demanda atmosférica de los próximos días para anticipar riego.' },
              { title: 'Uso práctico', body: 'Multiplica por el Kc del cultivo y descuenta la lluvia efectiva.' },
            ],
          }}
        >
          <ForecastMetricCard label="ET0 total 5d" value={fmtN(totalEto, 1)} unit="mm" caption="Demanda atmosférica acumulada" tone={totalEto >= 20 ? 'amber' : 'sky'} />
        </ForecastClickable>
        <ForecastClickable
          onOpen={setExpandedDetail}
          detail={{
            title: 'Corrección de sesgo térmico',
            subtitle: 'Ajuste estadístico aplicado a temperatura',
            tone: 'slate',
            headline: `${formatSigned(bias.temperature.all, 2, '°C')} sobre la temperatura base`,
            metrics: [
              { label: 'Sesgo total', value: formatSigned(bias.temperature.all, 2, '°C'), tone: 'slate' },
              { label: 'Día', value: formatSigned(bias.temperature.day, 2, '°C'), tone: 'sky' },
              { label: 'Noche', value: formatSigned(bias.temperature.night, 2, '°C'), tone: 'slate' },
            ],
            sections: [
              { title: 'Qué significa', body: 'El sistema compara el pronóstico base con el comportamiento observado/modelado local y corrige desviaciones sistemáticas.' },
              { title: 'Por qué importa', body: 'Un pequeño sesgo nocturno puede cambiar avisos de helada; un sesgo diurno afecta ET0, estrés térmico y decisiones de riego.' },
            ],
          }}
        >
          <ForecastMetricCard label="Sesgo T" value={formatSigned(bias.temperature.all, 2)} unit="°C" caption={`Día: ${bias.temperature.day.toFixed(2)}°C · Noche: ${bias.temperature.night.toFixed(2)}°C`} />
        </ForecastClickable>
        <ForecastClickable
          onOpen={setExpandedDetail}
          detail={{
            title: 'Corrección de sesgo de humedad',
            subtitle: 'Ajuste aplicado a humedad relativa',
            tone: 'sky',
            headline: `${formatSigned(bias.humidity, 1, '%')} sobre HR prevista`,
            metrics: [{ label: 'Sesgo HR', value: formatSigned(bias.humidity, 1, '%'), tone: 'sky' }],
            sections: [
              { title: 'Qué significa', body: 'La humedad corregida mejora cálculo de punto de rocío, riesgo de hielo/helada, evaporación y confort ganadero.' },
              { title: 'Lectura rápida', body: bias.humidity > 0 ? 'El modelo base tiende a quedarse seco para el llano; se incrementa la HR.' : 'El modelo base tiende a pasarse de humedad; se reduce la HR.' },
            ],
          }}
        >
          <ForecastMetricCard label="Sesgo HR" value={formatSigned(bias.humidity, 1)} unit="%" caption="Corrección aplicada a humedad" tone="sky" />
        </ForecastClickable>
        <ForecastClickable
          onOpen={setExpandedDetail}
          detail={{
            title: 'Corrección de sesgo de viento',
            subtitle: 'Ajuste aplicado a viento medio',
            tone: 'slate',
            headline: `${formatSigned(bias.wind, 1, ' km/h')} sobre viento previsto`,
            metrics: [{ label: 'Sesgo viento', value: formatSigned(bias.wind, 1, ' km/h'), tone: 'slate' }],
            sections: [
              { title: 'Qué significa', body: 'El viento condiciona ET0, deriva de tratamientos, sensación térmica y riesgo operativo. El ajuste evita trasladar al llano un viento demasiado expuesto.' },
              { title: 'Qué hacer', body: 'Si el viento corregido sube, evitar tratamientos sensibles a deriva y revisar riego por mayor evaporación. Si baja, aumenta la probabilidad de inversión térmica nocturna.' },
            ],
          }}
        >
          <ForecastMetricCard label="Sesgo viento" value={formatSigned(bias.wind, 1)} unit="km/h" caption="Corrección aplicada a viento" />
        </ForecastClickable>
        </div>
      </div>

      {expandedDetail && <ForecastModal detail={expandedDetail} onClose={() => setExpandedDetail(null)} />}
    </section>
  );
}
