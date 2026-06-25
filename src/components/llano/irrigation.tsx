'use client';

import { useState } from 'react';
import { fmtN } from '@/components/llano/atoms';
import { IndicatorHelp, LabelWithHelp } from '@/components/llano/indicator-help';

export type IrrigationNeed = 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'muy_alto';

export function classifyIrrigationNeed(litersPerM2: number | null | undefined): { label: string; tone: 'emerald' | 'sky' | 'amber' | 'rose'; key: IrrigationNeed } {
  if (litersPerM2 === null || litersPerM2 === undefined || !Number.isFinite(litersPerM2) || litersPerM2 <= 0) {
    return { label: 'Muy bajo', tone: 'emerald', key: 'muy_bajo' };
  }
  if (litersPerM2 <= 15) return { label: 'Muy bajo', tone: 'emerald', key: 'muy_bajo' };
  if (litersPerM2 <= 35) return { label: 'Bajo', tone: 'sky', key: 'bajo' };
  if (litersPerM2 <= 60) return { label: 'Medio', tone: 'amber', key: 'medio' };
  if (litersPerM2 <= 90) return { label: 'Alto', tone: 'rose', key: 'alto' };
  return { label: 'Muy alto', tone: 'rose', key: 'muy_alto' };
}

export function irrigationRange(litersPerM2: number): { min: number; max: number } {
  return {
    min: Math.round(litersPerM2 * 0.85),
    max: Math.round(litersPerM2 * 1.2),
  };
}

export function litersToCubicMeters(liters: number): number {
  return liters / 1000;
}

export function formatAreaWater(areaM2: number, litersPerM2: number): { liters: number; cubicMeters: number } {
  const liters = areaM2 * litersPerM2;
  return { liters, cubicMeters: litersToCubicMeters(liters) };
}

export function defaultIrrigationAdjustments(): string[] {
  return [
    'tipo de suelo',
    'edad del cultivo',
    'humedad real del terreno',
    'sistema de riego',
    'estado fenológico',
  ];
}

export function cropIrrigationPhrase(cropName: string | undefined, litersPerM2: number | null | undefined, levelOverride?: IrrigationNeed): string | null {
  const amount = litersPerM2 != null && Number.isFinite(litersPerM2) ? Math.max(0, litersPerM2) : null;
  if (!cropName || amount === null) return null;

  const level = levelOverride ?? classifyIrrigationNeed(amount).key;
  const key = cropName.toLowerCase();

  const byCrop: Record<string, Record<IrrigationNeed, string>> = {
    pistacho: {
      muy_bajo: 'Pistacho en descanso o con lluvia suficiente.',
      bajo: 'Pistacho con demanda contenida. Vigila el bulbo húmedo.',
      medio: 'Pistacho con necesidad media; riega sin encharcar.',
      alto: 'Pistacho con demanda alta por calor y secano.',
      muy_alto: 'Pistacho muy exigente esta semana. Prioriza un riego profundo y estable.',
    },
    almendro: {
      muy_bajo: 'Almendro con agua suficiente por ahora.',
      bajo: 'Almendro tranquilo, pero revisa la humedad del suelo.',
      medio: 'Almendro en demanda media. Conviene no apurar el riego.',
      alto: 'Almendro con demanda alta. Mejor no retrasar el aporte.',
      muy_alto: 'Almendro muy exigente: el cultivo pide agua ya.',
    },
    olivo: {
      muy_bajo: 'Olivo con riego mínimo o lluvia suficiente.',
      bajo: 'Olivo en necesidad ligera. Mantén seguimiento.',
      medio: 'Olivo con demanda media, sobre todo si el suelo es poco profundo.',
      alto: 'Olivo con demanda alta por calor y sequedad.',
      muy_alto: 'Olivo muy exigente: conviene priorizar el riego.',
    },
    tomate: {
      muy_bajo: 'Tomate bien cubierto, pero sin bajar la guardia.',
      bajo: 'Tomate con consumo contenido. Riega corto y frecuente.',
      medio: 'Tomate en demanda media. Evita altibajos de humedad.',
      alto: 'Tomate con riego alto: el cultivo pide constancia.',
      muy_alto: 'Tomate muy exigente. No dejes secar el suelo.',
    },
    pepino: {
      muy_bajo: 'Pepino con agua suficiente por ahora.',
      bajo: 'Pepino con consumo suave.',
      medio: 'Pepino en demanda media. Mejor riegos regulares.',
      alto: 'Pepino pide bastante agua esta semana.',
      muy_alto: 'Pepino muy exigente: necesita humedad estable.',
    },
    patata: {
      muy_bajo: 'Patata con consumo bajo por ahora.',
      bajo: 'Patata con riego suave y controlado.',
      medio: 'Patata en demanda media. Evita golpes de sequía.',
      alto: 'Patata con demanda alta, sobre todo en tuberización.',
      muy_alto: 'Patata muy exigente: no conviene retrasar el riego.',
    },
    melón: {
      muy_bajo: 'Melón con consumo bajo o lluvia suficiente.',
      bajo: 'Melón con riego suave.',
      medio: 'Melón en demanda media. Vigila el estrés hídrico.',
      alto: 'Melón con demanda alta en una fase sensible.',
      muy_alto: 'Melón muy exigente: necesita aporte firme.',
    },
    sandía: {
      muy_bajo: 'Sandía con agua suficiente por ahora.',
      bajo: 'Sandía con consumo suave.',
      medio: 'Sandía en demanda media. Mejor riego regular.',
      alto: 'Sandía con demanda alta por calor.',
      muy_alto: 'Sandía muy exigente: prioriza mantener humedad estable.',
    },
    'habichuela verde': {
      muy_bajo: 'Habichuela con riego mínimo o lluvia suficiente.',
      bajo: 'Habichuela con demanda ligera.',
      medio: 'Habichuela en demanda media. Riegos regulares.',
      alto: 'Habichuela con demanda alta en producción.',
      muy_alto: 'Habichuela muy exigente: no dejes secar la capa activa.',
    },
    vid: {
      muy_bajo: 'Vid con agua suficiente por ahora.',
      bajo: 'Vid con consumo ligero.',
      medio: 'Vid en demanda media. Mejor no apurar.',
      alto: 'Vid con demanda alta, sobre todo en verano.',
      muy_alto: 'Vid muy exigente: el estrés hídrico ya pesa.',
    },
    calabaza: {
      muy_bajo: 'Calabaza con agua suficiente por ahora.',
      bajo: 'Calabaza con consumo suave.',
      medio: 'Calabaza en demanda media. Riegos constantes.',
      alto: 'Calabaza con demanda alta por calor y fruto en marcha.',
      muy_alto: 'Calabaza muy exigente: necesita agua ya.',
    },
    calabacín: {
      muy_bajo: 'Calabacín con agua suficiente por ahora.',
      bajo: 'Calabacín con consumo suave.',
      medio: 'Calabacín en demanda media. Mejor riego frecuente.',
      alto: 'Calabacín con demanda alta en plena producción.',
      muy_alto: 'Calabacín muy exigente: no conviene aflojar el riego.',
    },
  };

  const phr = byCrop[key]?.[level] ?? null;
  return phr ?? null;
}

export function IrrigationCard({
  litersPerM2,
  title = 'Riego recomendado esta semana',
  subtitle,
  et0Mm,
  kc,
  precipitationMm,
  cropContext,
  adjustments = defaultIrrigationAdjustments(),
  compact = false,
  needOverride,
  cropName,
  cropPhrase,
}: {
  litersPerM2: number | null | undefined;
  title?: string;
  subtitle?: string;
  et0Mm?: number | null;
  kc?: number | null;
  precipitationMm?: number | null;
  cropContext?: string;
  adjustments?: string[];
  compact?: boolean;
  needOverride?: { label: string; tone: 'emerald' | 'sky' | 'amber' | 'rose'; key?: IrrigationNeed };
  cropName?: string;
  cropPhrase?: string | null;
}) {
  const amount = litersPerM2 != null && Number.isFinite(litersPerM2) ? Math.max(0, litersPerM2) : null;
  const [areaInput, setAreaInput] = useState('100');
  const areaM2 = Math.max(0, Number(areaInput) || 0);
  const level = needOverride ?? classifyIrrigationNeed(amount);
  const range = amount !== null ? irrigationRange(amount) : null;
  const formatValue = (value: number | null | undefined, digits = 1) => fmtN(value ?? null, digits);
  const showNoNeed = amount === null || amount <= 0;
  const total = amount !== null ? formatAreaWater(areaM2, amount) : null;
  const cropPhraseText = cropPhrase ?? cropIrrigationPhrase(cropName, amount, level.key);
  const maxBar = Math.max(et0Mm ?? 0, amount ?? 0, range?.max ?? 0, 1);
  const recommendation = cropPhraseText
    ?? (showNoNeed
      ? 'No hace falta riego extra salvo plantas jóvenes, macetas o suelos muy secos.'
      : 'Revisar humedad del suelo y priorizar riegos en parcelas con cultivo activo.');

  return (
    <section className="rounded-[22px] border border-sky-200 bg-sky-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">💧 {title}</p>
          {subtitle && <p className="mt-1 text-sm text-slate-700">{subtitle}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${level.tone === 'emerald' ? 'bg-emerald-100 text-emerald-800' : level.tone === 'sky' ? 'bg-sky-100 text-sky-800' : level.tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
          {showNoNeed ? 'Muy bajo' : level.label}
        </span>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Dato principal<IndicatorHelp term="litersM2" /></div>
        <p className="mt-2 text-3xl font-black text-slate-950">
          {showNoNeed ? 'No hace falta riego extra' : `${formatValue(amount, 1)} L/m² esta semana`}
        </p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <IrrigationMetric
          label="Rango prudente"
          value={showNoNeed || range === null ? '0 L/m²' : `${formatValue(range.min, 0)}-${formatValue(range.max, 0)} L/m²`}
          help="litersM2"
        />
        <IrrigationMetric label="Nivel de necesidad" value={showNoNeed ? 'Muy bajo' : level.label.toUpperCase()} />
        <IrrigationMetric label="Equivale a" value={showNoNeed ? '0 mm' : `${formatValue(amount, 1)} mm`} help="litersM2" />
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 p-4 text-sm leading-6 text-slate-800">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Recomendación</p>
        <p className="mt-1 font-semibold text-slate-950">{recommendation}</p>
      </div>

      <details className="mt-4 rounded-2xl border border-sky-100 bg-white/80 p-4">
        <summary className="cursor-pointer text-sm font-bold text-sky-800">Ver cálculo técnico</summary>
        <div className="mt-4 space-y-4">
          <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-800">
            {amount !== null && amount > 0 && (
              <p>
                Si riegas <span className="font-bold text-sky-800">{formatValue(amount, 1)} L/m²</span>, eso son aprox. <span className="font-bold text-sky-800">{formatValue(amount, 1)} mm</span> en la semana.
              </p>
            )}
            {et0Mm !== undefined && et0Mm !== null && (
              <p>
                <LabelWithHelp term="et0">ET0 semanal</LabelWithHelp>: <span className="font-bold text-slate-900">{formatValue(et0Mm, 1)} mm</span>{kc != null ? <> · <LabelWithHelp term="kc">Kc usado</LabelWithHelp>: {kc.toFixed(2)}</> : ''}
              </p>
            )}
            {precipitationMm !== undefined && precipitationMm !== null && (
              <p>
                Lluvia descontada: <span className="font-bold text-slate-900">{formatValue(precipitationMm, 1)} mm</span>
              </p>
            )}
            {cropContext && <p className="text-slate-700">{cropContext}</p>}
          </div>

          {!showNoNeed && (
            <div className="rounded-2xl bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Demanda de agua estimada</p>
          <WaterBar label="ET0 semanal" value={et0Mm ?? 0} max={maxBar} color="bg-orange-500" suffix="mm" />
          <WaterBar label="Riego recomendado" value={amount ?? 0} max={maxBar} color="bg-sky-600" suffix="L/m²" />
          {range && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
                <span>Rango prudente</span>
                <span>{range.min}-{range.max} L/m²</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100">
                <div
                  className="h-3 rounded-full bg-sky-200"
                  style={{ marginLeft: `${Math.min(100, (range.min / maxBar) * 100)}%`, width: `${Math.min(100, ((range.max - range.min) / maxBar) * 100)}%` }}
                />
              </div>
            </div>
          )}
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 text-sm leading-6 text-slate-700">
            <p className="font-bold text-slate-900">¿Qué significa L/m²?</p>
          <p>1 L/m² equivale aproximadamente a 1 mm de lluvia o riego repartido sobre el terreno.</p>
          <p>Ejemplo: 72 L/m² son unos 72 mm de agua acumulada en la semana.</p>
          <p>En 1 hectárea (10.000 m²), 72 L/m² equivalen a 720.000 litros, es decir, 720 m³.</p>
          </div>

          {!compact && amount !== null && amount > 0 && (
            <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Calculadora rápida de riego</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr] sm:items-end">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Superficie (m²)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-400 focus:border-sky-300"
              />
            </label>
            <div className="rounded-xl bg-white/10 px-3 py-2 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Agua total estimada</p>
              <p className="mt-1 font-bold text-white">
                {areaM2 > 0 && total !== null
                  ? `${formatValue(total.liters, 0)} L/semana · ${formatValue(total.cubicMeters, 2)} m³`
                  : 'Introduce una superficie para calcularlo'}
              </p>
              {areaM2 > 0 && total !== null && (
                <p className="mt-1 text-xs text-slate-300">{areaM2.toFixed(0)} × {amount.toFixed(1)} = {formatValue(total.liters, 0)} litros</p>
              )}
            </div>
          </div>
            </div>
          )}
        </div>
      </details>

      <p className="mt-4 text-xs leading-5 text-slate-700">
        Ajustar según {adjustments.slice(0, 5).join(', ')}.
      </p>
    </section>
  );
}

function IrrigationMetric({ label, value, help }: { label: string; value: string; help?: Parameters<typeof IndicatorHelp>[0]['term'] }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">{label}<IndicatorHelp term={help} /></div>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function WaterBar({ label, value, max, color, suffix }: { label: string; value: number; max: number; color: string; suffix: string }) {
  const width = Math.max(2, Math.min(100, (value / max) * 100));
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
        <LabelWithHelp term={label === 'ET0 semanal' ? 'et0' : label === 'Riego recomendado' ? 'litersM2' : undefined}>{label}</LabelWithHelp>
        <span>{fmtN(value, 1)} {suffix}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
