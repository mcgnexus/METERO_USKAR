'use client';

import { useState } from 'react';
import { fmtN, KpiChip } from '@/components/llano/atoms';
import { CropRequirements } from '@/components/llano/crop-requirements';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { AgriculturalData } from '@/types/weather';

function frostTone(risk: AgriculturalData['frostRisk48h']): 'default' | 'warning' | 'danger' | 'success' {
  if (risk === 'muy_alta') return 'danger';
  if (risk === 'alta') return 'danger';
  if (risk === 'media') return 'warning';
  return 'success';
}

function frostLabel(risk: AgriculturalData['frostRisk48h']): string {
  if (risk === 'muy_alta') return 'Muy alto';
  if (risk === 'alta') return 'Alto';
  if (risk === 'media') return 'Medio';
  return 'Sin riesgo';
}

interface AgronomyDetail {
  title: string;
  value: string;
  unit?: string;
  tone: 'sky' | 'slate' | 'emerald' | 'rose' | 'amber';
  sections: { title: string; body: string }[];
}

function modalTone(tone: AgronomyDetail['tone']): string {
  if (tone === 'sky') return 'border-sky-200 bg-sky-50 text-slate-950';
  if (tone === 'emerald') return 'border-emerald-200 bg-emerald-50 text-slate-950';
  if (tone === 'rose') return 'border-rose-200 bg-rose-50 text-slate-950';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-slate-950';
  return 'border-slate-200 bg-white text-slate-950';
}

function AgronomyModal({ detail, onClose }: { detail: AgronomyDetail; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border p-6 ${modalTone(detail.tone)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa agronómica</p>
            <h2 className="mt-1 text-2xl font-black">{detail.title}</h2>
            <p className="mt-3 text-4xl font-black">
              {detail.value}
              {detail.unit && <span className="ml-2 text-base font-bold text-slate-500">{detail.unit}</span>}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-black/10 p-2 text-slate-700 hover:bg-black/20"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {detail.sections.map((section) => (
            <section key={section.title} className="rounded-2xl bg-white/70 p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClickableCard({ detail, onOpen, children }: {
  detail: AgronomyDetail;
  onOpen: (detail: AgronomyDetail) => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className="block w-full text-left" onClick={() => onOpen(detail)}>
      <div className="transition-all hover:-translate-y-0.5 hover:shadow-lg">
        {children}
      </div>
    </button>
  );
}

export function AgricultureSection({ agricultural, climate, precipitacionSemanal }: {
  agricultural: AgriculturalData | null;
  climate: ClimateCalibrationPayload;
  precipitacionSemanal: number | null;
}) {
  const exotic = climate.exoticVariables;
  const airTemp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const soil10 = exotic.soilTemp10cmC;
  const soil40 = exotic.soilTemp40cmC;
  const [expandedDetail, setExpandedDetail] = useState<AgronomyDetail | null>(null);

  const workabilityDetail: AgronomyDetail | null = agricultural ? {
    title: agricultural.workability.workable ? 'Suelo operable' : 'Labores no recomendadas',
    value: agricultural.workability.workable ? 'Apto' : 'No apto',
    tone: agricultural.workability.workable ? 'emerald' : 'rose',
    sections: [
      {
        title: 'Qué significa',
        body: agricultural.workability.workable
          ? 'Las condiciones actuales permiten labores sin aumentar mucho el riesgo de compactación, daño al cultivo o pérdidas por barro.'
          : 'Hay condiciones que pueden comprometer labores: helada, suelo demasiado húmedo, frío intenso, barro, viento o baja capacidad de trabajo.',
      },
      {
        title: 'Motivos detectados',
        body: agricultural.workability.reasons.length > 0
          ? agricultural.workability.reasons.join(' · ')
          : 'No hay motivos restrictivos activos en este momento.',
      },
      {
        title: 'Qué hacer',
        body: agricultural.workability.workable
          ? 'Priorizar labores sensibles a ventana corta: tratamientos, revisión de goteo, siembra o preparación superficial. Mantener vigilancia si hay cambios de viento o lluvia.'
          : 'Retrasar labores pesadas, evitar entrar con maquinaria si el suelo no porta bien y revisar de nuevo cuando baje la humedad o mejore la temperatura.',
      },
    ],
  } : null;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Agricultura</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Capa agronómica</h2>
        </div>
        {agricultural && (
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${agricultural.workability.workable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {agricultural.workability.workable ? 'Suelo operable' : 'Labores no recomendadas'}
          </span>
        )}
      </div>

      {agricultural ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ClickableCard
              onOpen={setExpandedDetail}
              detail={{
                title: 'ET0 acumulada 7 días',
                value: fmtN(agricultural.et0CumulativeMm, 1),
                unit: 'mm',
                tone: 'sky',
                sections: [
                  { title: 'Qué significa', body: 'ET0 es la evapotranspiración de referencia: el agua que demanda la atmósfera por temperatura, radiación, humedad y viento. Cuanto más alta, más agua pierde el cultivo y el suelo.' },
                  { title: 'Cómo se usa', body: `Para riego por cultivo se multiplica por el Kc fenológico: ETc = ET0 x Kc. Después se descuenta la lluvia semanal (${fmtN(precipitacionSemanal, 1)} mm).` },
                  { title: 'Qué hacer', body: 'Si el valor sube varios días seguidos, revisar programación de goteo, humedad en bulbo y cultivos en fase media o llenado de fruto, que son los más exigentes.' },
                ],
              }}
            >
              <KpiChip label="ET0 acumulada 7d" value={fmtN(agricultural.et0CumulativeMm, 1)} unit="mm" caption="Evapotranspiración de referencia" tone="accent" />
            </ClickableCard>
            <ClickableCard
              onOpen={setExpandedDetail}
              detail={{
                title: 'Grados día acumulados',
                value: fmtN(agricultural.gddCumulative, 0),
                tone: 'slate',
                sections: [
                  { title: 'Qué significa', body: 'Los GDD miden calor útil acumulado para desarrollo vegetal. Ayudan a estimar brotación, floración, cuajado, maduración y avance real del ciclo.' },
                  { title: 'Cómo se calcula', body: 'Se acumula la temperatura efectiva por encima de una temperatura base del cultivo. Cada cultivo tiene una base distinta: por ejemplo patata usa una base más baja que tomate o vid.' },
                  { title: 'Qué hacer', body: 'Usarlo junto a la sección de cultivos: si un cultivo va corto de GDD, puede retrasar floración/cosecha; si va alto, anticipar riego, recolección o vigilancia de estrés.' },
                ],
              }}
            >
              <KpiChip label="GDD" value={fmtN(agricultural.gddCumulative, 0)} caption="Grados día acumulados" />
            </ClickableCard>
            <ClickableCard
              onOpen={setExpandedDetail}
              detail={{
                title: 'Horas-frío',
                value: fmtN(agricultural.chillHours, 0),
                unit: 'h',
                tone: 'slate',
                sections: [
                  { title: 'Qué significa', body: 'Las horas-frío indican acumulación de frío útil para romper dormancia en leñosos. Son clave para almendro, pistacho, vid y otros cultivos que necesitan reposo invernal.' },
                  { title: 'Lectura actual', body: agricultural.yearlyChillHoursAccumulated !== undefined ? `En la ventana de 7 días hay ${fmtN(agricultural.chillHours, 0)} h y el acumulado estacional estimado es ${agricultural.yearlyChillHoursAccumulated} h.` : `En la ventana de 7 días hay ${fmtN(agricultural.chillHours, 0)} h. No hay acumulado estacional disponible en esta respuesta.` },
                  { title: 'Qué hacer', body: 'Comparar con las necesidades del cultivo en las tarjetas inferiores. Si hay déficit, puede haber floración irregular, mala brotación o menor cuajado.' },
                ],
              }}
            >
              <KpiChip label="Horas-frío 7d" value={fmtN(agricultural.chillHours, 0)} unit="h" caption={agricultural.yearlyChillHoursAccumulated !== undefined ? `Acumulado estacional: ${agricultural.yearlyChillHoursAccumulated} h` : 'Pronóstico'} />
            </ClickableCard>
            <ClickableCard
              onOpen={setExpandedDetail}
              detail={{
                title: 'Riesgo de helada 48h',
                value: frostLabel(agricultural.frostRisk48h),
                tone: agricultural.frostRisk48h === 'none' ? 'emerald' : agricultural.frostRisk48h === 'media' ? 'amber' : 'rose',
                sections: [
                  { title: 'Qué significa', body: 'Resume el riesgo microclimático de helada para las próximas 48 horas, combinando temperatura prevista, inversión térmica, drenaje de aire frío y sensibilidad local del llano.' },
                  { title: 'Nivel actual', body: `El nivel actual es ${frostLabel(agricultural.frostRisk48h)}. En zonas bajas o vaguadas el riesgo puede ser mayor que en el casco urbano.` },
                  { title: 'Qué hacer', body: agricultural.frostRisk48h === 'none' ? 'Sin acción inmediata. Mantener vigilancia si cambia el viento o aparece noche despejada con calma.' : 'Preparar protección antihelada en cultivos sensibles, evitar riegos o labores que aumenten daño, y revisar mínimos previstos por parcela.' },
                ],
              }}
            >
              <KpiChip label="Helada 48h" value={frostLabel(agricultural.frostRisk48h)} caption="Riesgo microclimático local" tone={frostTone(agricultural.frostRisk48h)} />
            </ClickableCard>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <ClickableCard
              onOpen={setExpandedDetail}
              detail={{
                title: 'Temperatura del suelo',
                value: `${fmtN(soil10, 1)} / ${fmtN(soil40, 1)}`,
                unit: '°C',
                tone: 'sky',
                sections: [
                  { title: 'Qué significa', body: 'La temperatura a 10 cm condiciona siembra, germinación y actividad radicular superficial. La temperatura a 40 cm muestra la inercia térmica del perfil y ayuda a interpretar estrés o recuperación.' },
                  { title: 'Lectura actual', body: `Suelo 10 cm: ${fmtN(soil10, 1)} °C. Suelo 40 cm: ${fmtN(soil40, 1)} °C. Aire de referencia: ${fmtN(airTemp, 1)} °C.` },
                  { title: 'Qué hacer', body: 'Para siembra, priorizar el umbral específico de cada cultivo. Si el suelo superficial está frío, retrasar siembras sensibles; si está caliente y seco, revisar humedad antes de sembrar o trasplantar.' },
                ],
              }}
            >
              <article className="rounded-[22px] border border-sky-200 bg-sky-50/60 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Suelo y siembra</p>
                <h3 className="mt-1 text-lg font-black text-slate-950">Temperatura del suelo</h3>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">T 10 cm</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{fmtN(soil10, 1)}°C</p>
                    {soil10 !== null && airTemp !== null && (
                      <p className="mt-0.5 text-xs text-slate-500">Δ vs aire: {(soil10 - airTemp > 0 ? '+' : '') + (soil10 - airTemp).toFixed(1)}°C</p>
                    )}
                  </div>
                  <div className="rounded-2xl bg-white p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">T 40 cm</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{fmtN(soil40, 1)}°C</p>
                    {soil40 !== null && airTemp !== null && (
                      <p className="mt-0.5 text-xs text-slate-500">Δ vs aire: {(soil40 - airTemp > 0 ? '+' : '') + (soil40 - airTemp).toFixed(1)}°C</p>
                    )}
                  </div>
                </div>
              </article>
            </ClickableCard>

            {agricultural.recommendedIrrigationLitersM2 !== undefined && (
              <ClickableCard
                onOpen={setExpandedDetail}
                detail={{
                  title: 'Riego recomendado general',
                  value: agricultural.recommendedIrrigationLitersM2 > 0 ? agricultural.recommendedIrrigationLitersM2.toFixed(1) : '0.0',
                  unit: 'l/m²',
                  tone: 'emerald',
                  sections: [
                    { title: 'Qué significa', body: 'Estimación general de agua a aportar esta semana por metro cuadrado. Sirve como referencia rápida, no sustituye el cálculo por cultivo de las tarjetas inferiores.' },
                    { title: 'Cómo se calcula', body: `Balance hídrico semanal: demanda por ET0 (${fmtN(agricultural.et0CumulativeMm, 1)} mm) ajustada con Kc orientativo y lluvia semanal (${fmtN(precipitacionSemanal, 1)} mm). 1 mm equivale aproximadamente a 1 l/m².` },
                    { title: 'Qué hacer', body: agricultural.recommendedIrrigationLitersM2 > 0 ? 'Repartir el aporte en varios pulsos si el suelo infiltra mal o hay calor. Ajustar siempre por cultivo, fase fenológica, textura y sistema de riego.' : 'No aportar riego general salvo cultivos recién implantados, macetas, suelos muy arenosos o parcelas con déficit confirmado.' },
                  ],
                }}
              >
                <article className="rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Riego recomendado</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {agricultural.recommendedIrrigationLitersM2 > 0
                      ? `${agricultural.recommendedIrrigationLitersM2.toFixed(1)} l/m²`
                      : 'No requiere riego'}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Balance hídrico semanal con Kc 0.70 (olivar/almendro). Ajustar por tipo de cultivo y estado fenológico.
                  </p>
                </article>
              </ClickableCard>
            )}
          </div>



          {agricultural.workability.reasons.length > 0 && (
            workabilityDetail && (
              <button type="button" className="mt-4 block w-full text-left" onClick={() => setExpandedDetail(workabilityDetail)}>
                <div className="rounded-[20px] border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-900 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <p className="font-bold">Motivos operativos</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {agricultural.workability.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </button>
            )
          )}

          <CropRequirements
            agricultural={agricultural}
            soilTemp={soil10}
            frostRisk={agricultural.frostRisk48h}
            et0CumulativeMm={agricultural.et0CumulativeMm}
            precipitacionSemanal={precipitacionSemanal}
          />

          {expandedDetail && <AgronomyModal detail={expandedDetail} onClose={() => setExpandedDetail(null)} />}
        </>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Sin datos agrícolas en la respuesta actual.</p>
      )}
    </section>
  );
}
