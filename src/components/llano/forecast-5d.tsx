'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { dayLabel } from '@/lib/display';
import { type ForecastPayload } from '@/hooks/useForecast';
import { fmtN, KpiChip } from '@/components/llano/atoms';

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

function formatSigned(value: number, digits: number, unit = ''): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}${unit}`;
}

export function Forecast5d({ forecast }: { forecast: ForecastPayload | null }) {
  const [expandedDetail, setExpandedDetail] = useState<ForecastDetail | null>(null);

  if (!forecast?.forecastDays?.length) return null;

  const days = forecast.forecastDays;
  const totalEto = days.reduce((s, d) => s + (d.dailySummary.et0TotalMm ?? 0), 0);
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
          const radiation = d.dailySummary.radiationTotalMJm2;
          const tempRange = min !== null && max !== null ? max - min : null;
          const detail: ForecastDetail = {
            title: dayLabel(d.date),
            subtitle: new Date(d.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
            tone: (d.dailySummary.et0TotalMm ?? 0) >= 5 ? 'amber' : 'emerald',
            headline: min !== null && max !== null
              ? `${min.toFixed(0)}°C mínima / ${max.toFixed(0)}°C máxima`
              : 'Temperatura no disponible',
            metrics: [
              { label: 'Media térmica', value: d.dailySummary.tempMeanC !== null ? `${d.dailySummary.tempMeanC.toFixed(1)}°C` : 'Sin dato', tone: 'slate' },
              { label: 'Amplitud', value: tempRange !== null ? `${tempRange.toFixed(1)}°C` : 'Sin dato', tone: tempRange !== null && tempRange >= 25 ? 'amber' : 'slate' },
              { label: 'HR media', value: d.dailySummary.humidityMeanPct !== null ? `${d.dailySummary.humidityMeanPct.toFixed(0)}%` : 'Sin dato', tone: 'sky' },
              { label: 'Viento medio', value: d.dailySummary.windMeanKmh !== null ? `${d.dailySummary.windMeanKmh.toFixed(1)} km/h` : 'Sin dato', tone: 'slate' },
              { label: 'ET0', value: `${fmtN(d.dailySummary.et0TotalMm, 1)} mm`, tone: (d.dailySummary.et0TotalMm ?? 0) >= 5 ? 'amber' : 'emerald' },
              { label: 'Radiación', value: radiation !== null ? `${radiation.toFixed(1)} MJ/m²` : 'Sin dato', tone: 'sky' },
            ],
            sections: [
              {
                title: 'Interpretación agronómica',
                emphasis: (d.dailySummary.et0TotalMm ?? 0) >= 5 ? 'Demanda hídrica alta' : 'Demanda hídrica moderada o baja',
                body: 'La ET0 resume la demanda atmosférica. Si coincide con radiación alta, viento o humedad baja, conviene revisar humedad del suelo y ajustar riego por Kc del cultivo.',
              },
              {
                title: 'Riesgo térmico',
                emphasis: tempRange !== null && tempRange >= 25 ? 'Día con mucha oscilación térmica' : 'Oscilación térmica contenida',
                body: tempRange !== null && tempRange >= 25
                  ? 'Una amplitud alta puede combinar frío nocturno con estrés diurno. Vigilar cultivos recién trasplantados, floración y animales en exterior.'
                  : 'No se detecta una amplitud extrema. Aun así, revisar mínima si hay cultivos sensibles o zonas bajas con inversión térmica.',
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
              <article className="rounded-[22px] border border-slate-100 bg-slate-50 p-4 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{dayLabel(d.date)}</p>
                <p className="mt-3 text-2xl font-black text-slate-950">
                  {min !== null && max !== null ? `${min.toFixed(0)}° / ${max.toFixed(0)}°` : '—'}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Media {d.dailySummary.tempMeanC !== null ? `${d.dailySummary.tempMeanC.toFixed(1)}°C` : '—'}
                </p>
                <p className="mt-2 text-[11px] font-bold text-sky-700">HR media: {d.dailySummary.humidityMeanPct !== null ? `${d.dailySummary.humidityMeanPct.toFixed(0)}%` : '—'}</p>
                <p className="text-[11px] font-bold text-emerald-700">ETo: {fmtN(d.dailySummary.et0TotalMm, 1)} mm</p>
                {radiation !== null && <p className="text-[10px] text-slate-400">Rs: {radiation.toFixed(1)} MJ/m²</p>}
              </article>
            </ForecastClickable>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ForecastClickable
          onOpen={setExpandedDetail}
          detail={{
            title: 'ET0 total 5 días',
            subtitle: 'Evapotranspiración acumulada del periodo',
            tone: totalEto >= 20 ? 'amber' : 'sky',
            headline: `${fmtN(totalEto, 1)} mm de demanda atmosférica`,
            metrics: [{ label: 'ET0 acumulada', value: `${fmtN(totalEto, 1)} mm`, tone: totalEto >= 20 ? 'amber' : 'sky' }],
            sections: [
              { title: 'Qué significa', emphasis: totalEto >= 20 ? 'Demanda alta en 5 días' : 'Demanda contenida', body: 'Este valor suma la evaporación/transpiración potencial de los próximos días. Sirve para anticipar necesidades de riego antes de que el suelo entre en déficit.' },
              { title: 'Uso práctico', body: 'Multiplicar por el Kc de cada cultivo y descontar lluvia efectiva. En cultivos en fase media el consumo real se acerca más a esta demanda.' },
            ],
          }}
        >
          <KpiChip label="ET0 total 5d" value={fmtN(totalEto, 1)} unit="mm" caption="Evapotranspiración de referencia acumulada" tone="accent" />
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
          <KpiChip label="Sesgo T" value={formatSigned(bias.temperature.all, 2)} unit="°C" caption={`Día: ${bias.temperature.day.toFixed(2)}°C · Noche: ${bias.temperature.night.toFixed(2)}°C`} tone="default" />
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
          <KpiChip label="Sesgo HR" value={formatSigned(bias.humidity, 1)} unit="%" caption="Corrección aplicada a humedad" />
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
          <KpiChip label="Sesgo viento" value={formatSigned(bias.wind, 1)} unit="km/h" caption="Corrección aplicada a viento" />
        </ForecastClickable>
      </div>

      {expandedDetail && <ForecastModal detail={expandedDetail} onClose={() => setExpandedDetail(null)} />}
    </section>
  );
}
