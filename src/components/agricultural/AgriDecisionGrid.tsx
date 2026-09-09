'use client';

import type { HuescarWeatherResponse } from '@/types/weather-response';
import { fmt, frostRiskLabel } from '@/lib/display';

type Decision = {
  emoji: string;
  title: string;
  value: string;
  tone: 'good' | 'caution' | 'bad' | 'neutral';
  action: string;
};

function frostTone(risk: string): Decision['tone'] {
  if (risk === 'muy_alta' || risk === 'alta') return 'bad';
  if (risk === 'media') return 'caution';
  return 'good';
}

function buildDecisions({ response }: { response: HuescarWeatherResponse }): Decision[] {
  const wd = response.weather;
  const agri = wd?.agricultural;

  const frostRisk = agri?.frostRisk48h ?? 'none';
  const frost = {
    emoji: '❄️',
    title: 'Helada',
    value: agri ? frostRiskLabel(frostRisk) : '—',
    tone: frostTone(frostRisk),
    action:
      frostRisk === 'muy_alta' || frostRisk === 'alta'
        ? 'Prepara protección antihelada esta noche y evita regar con frío intenso.'
        : frostRisk === 'media'
          ? 'Vigila mínimos en zonas bajas; revisa cultivos sensibles.'
          : 'Sin acción inmediata contra la helada.',
  } satisfies Decision;

  const nowMs = new Date(response.generatedAt).getTime();
  const probToday = wd?.daily?.precipitationProbabilityPct?.[0] ?? null;
  const mmToday = wd?.daily?.precipitationSumMm?.[0] ?? null;
  const upcoming = (response.hourly ?? [])
    .filter((h) => h.time && new Date(h.time).getTime() >= nowMs)
    .slice(0, 6);
  const nextRainProb = upcoming.reduce<number | null>((max, h) => {
    if (h.precipitationProbabilityPct == null) return max;
    return max == null ? h.precipitationProbabilityPct : Math.max(max, h.precipitationProbabilityPct);
  }, null);
  const rainProb = nextRainProb ?? probToday;
  const rainVal = rainProb != null ? `${fmt(rainProb, 0)}%` : '—';

  const rain = {
    emoji: '🌧️',
    title: 'Lluvia',
    value: mmToday != null && mmToday > 0 && rainProb != null && rainProb >= 40 ? `${fmt(rainProb, 0)}% · ${fmt(mmToday, 1)} mm` : rainVal,
    tone: rainProb != null && rainProb >= 70 ? 'bad' : rainProb != null && rainProb >= 40 ? 'caution' : 'good',
    action:
      rainProb != null && rainProb >= 70
        ? 'Aplaza el riego y tareas que no aguanten el agua; aprovecha el aporte.'
        : rainProb != null && rainProb >= 40
          ? 'Lleva algo por si acaso; valora retrasar labores que no aguanten agua.'
          : 'Lluvia poco probable: mantén el plan de riego si toca.',
  } satisfies Decision;

  const irrigationLiters = agri?.recommendedIrrigationLitersM2 ?? null;
  const irrigation = {
    emoji: '💧',
    title: 'Riego',
    value:
      irrigationLiters != null
        ? irrigationLiters > 0
          ? `${fmt(irrigationLiters, 1)} L/m²`
          : 'No requiere'
        : '—',
    tone: irrigationLiters != null && irrigationLiters > 0 ? 'caution' : 'good',
    action:
      irrigationLiters != null && irrigationLiters > 0
        ? 'Revisa la humedad del suelo y riega en las horas de menos calor.'
        : 'Suelo con aporte suficiente: no fuerces riegos extras.',
  } satisfies Decision;

  return [frost, rain, irrigation];
}

const toneStyles: Record<Decision['tone'], string> = {
  good: 'border-emerald-200 bg-emerald-50/70',
  caution: 'border-amber-200 bg-amber-50/70',
  bad: 'border-rose-200 bg-rose-50/70',
  neutral: 'border-slate-200 bg-white',
};

const dotColor: Record<Decision['tone'], string> = {
  good: 'bg-emerald-500',
  caution: 'bg-amber-400',
  bad: 'bg-rose-500',
  neutral: 'bg-slate-400',
};

export function AgriDecisionGrid({ response }: { response: HuescarWeatherResponse }) {
  const decisions = buildDecisions({ response });

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">🌾 Tus decisiones de hoy</h2>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">lluvia · helada · riego</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {decisions.map((d) => (
          <div key={d.title} className={`rounded-2xl border p-3.5 shadow-sm ${toneStyles[d.tone]}`}>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{d.emoji}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{d.title}</span>
              <span className={`ml-auto inline-block h-2 w-2 rounded-full ${dotColor[d.tone]}`} />
            </div>
            <p className="mt-1.5 text-sm font-black text-slate-900">{d.value}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{d.action}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
