'use client';

import type { HuescarWeatherResponse } from '@/types/weather-response';
import { fmt } from '@/lib/display';
import { DataOriginNote, type DataOrigin } from '@/components/common/DataOriginNote';

type Preview = {
  emoji: string;
  kind: string;
  title: string;
  body: string;
  tagline: string;
  origin: DataOrigin;
};

function buildPreview({ response }: { response: HuescarWeatherResponse }): Preview {
  const wd = response.weather;
  const agri = wd?.agricultural;
  const frostRisk = agri?.frostRisk48h ?? 'none';
  const risk = agri?.recommendedIrrigationLitersM2 ?? null;
  const probToday = wd?.daily?.precipitationProbabilityPct?.[0] ?? null;

  if (frostRisk === 'muy_alta' || frostRisk === 'alta') {
    return {
      emoji: '❄️',
      kind: 'Aviso de helada',
      title: 'Helada fuerte esta madrugada',
      body: 'Mín. -3°C en zonas bajas de Huéscar. Protege cultivos sensibles, revisa riego antihelada y evita labores al amanecer.',
      tagline: 'Ejemplo de un aviso que recibirías en tu móvil con tu cultivo.',
      origin: 'forecast',
    };
  }

  if (probToday != null && probToday >= 70) {
    return {
      emoji: '🌧️',
      kind: 'Aviso de lluvia',
      title: 'Lluvia a partir de media tarde',
      body: `Prob. de lluvia del ${fmt(probToday, 0)}% en Huéscar. Aplaza el riego y guarda lo que no aguante el agua.`,
      tagline: 'Ejemplo de un aviso que recibirías en tu móvil con tu cultivo.',
      origin: 'forecast',
    };
  }

  if (risk != null && risk > 0) {
    return {
      emoji: '💧',
      kind: 'Aviso de riego',
      title: 'Recomendación de riego',
      body: `Demanda hídrica alta: aporta unos ${fmt(risk, 1)} L/m² en las próximas horas, repartidos para evitar escorrentía.`,
      tagline: 'Ejemplo de un aviso que recibirías en tu móvil con tu cultivo.',
      origin: 'recommendation',
    };
  }

  return {
    emoji: '❄️',
    kind: 'Aviso de helada',
    title: 'Noche despejada, posible helada',
    body: 'Cielo despejado y calma: en zonas bajas de Huéscar la mínima puede caer de 0°C. Revisa cultivos sensibles antes del amanecer.',
    tagline: 'Ejemplo del tipo de aviso que recibirías en tu móvil con tu cultivo.',
    origin: 'forecast',
  };
}

export function CustomAlertPreview({ response }: { response: HuescarWeatherResponse }) {
  const p = buildPreview({ response });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">📱 Así sería tu aviso</p>
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-slate-950 p-4 text-white">
        <span className="mt-0.5 text-2xl">{p.emoji}</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.kind}</p>
          <h3 className="text-sm font-black">{p.title}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-300">{p.body}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">💬 {p.tagline}</p>
      <div className="mt-2">
        <DataOriginNote
          origin={p.origin}
          confidence={null}
          updatedAt={response.generatedAt}
          detail={
            p.origin === 'recommendation'
              ? 'Recomendación del motor agronómico TecRural'
              : 'Previsión de Open-Meteo (ECMWF) evaluada por el motor climático'
          }
        />
      </div>
    </section>
  );
}
