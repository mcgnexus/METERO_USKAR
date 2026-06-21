'use client';

import { fmtN, KpiChip } from '@/components/llano/atoms';
import { CropRequirements } from '@/components/llano/crop-requirements';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { AgriculturalData } from '@/types/weather';

function frostTone(risk: AgriculturalData['frostRisk48h']): 'default' | 'warning' | 'danger' | 'success' {
  if (risk === 'muy_alta') return 'danger';
  if (risk === 'alta') return 'warning';
  if (risk === 'media') return 'warning';
  return 'success';
}

function frostLabel(risk: AgriculturalData['frostRisk48h']): string {
  if (risk === 'muy_alta') return 'Muy alto';
  if (risk === 'alta') return 'Alto';
  if (risk === 'media') return 'Medio';
  return 'Sin riesgo';
}

function pestTone(level: 'bajo' | 'medio' | 'alto'): 'success' | 'warning' | 'danger' {
  if (level === 'alto') return 'danger';
  if (level === 'medio') return 'warning';
  return 'success';
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
            <KpiChip
              label="ET0 acumulada 7d"
              value={fmtN(agricultural.et0CumulativeMm, 1)}
              unit="mm"
              caption="Evapotranspiración de referencia"
              tone="accent"
            />
            <KpiChip
              label="GDD"
              value={fmtN(agricultural.gddCumulative, 0)}
              caption="Grados día acumulados"
            />
            <KpiChip
              label="Horas-frío 7d"
              value={fmtN(agricultural.chillHours, 0)}
              unit="h"
              caption={agricultural.yearlyChillHoursAccumulated !== undefined ? `Acumulado estacional: ${agricultural.yearlyChillHoursAccumulated} h` : 'Pronóstico'}
            />
            <KpiChip
              label="Helada 48h"
              value={frostLabel(agricultural.frostRisk48h)}
              caption="Riesgo microclimático local"
              tone={frostTone(agricultural.frostRisk48h)}
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
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

            {agricultural.recommendedIrrigationLitersM2 !== undefined && (
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
            )}
          </div>

          {agricultural.pestRisk && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <article className={`rounded-[22px] border p-4 ${pestTone(agricultural.pestRisk.repiloRisk) === 'danger' ? 'border-rose-200 bg-rose-50/60' : pestTone(agricultural.pestRisk.repiloRisk) === 'warning' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Riesgo de repilo</p>
                <p className="mt-1 text-2xl font-black capitalize text-slate-950">{agricultural.pestRisk.repiloRisk}</p>
                <p className="mt-1 text-xs text-slate-600">Favorecido por HR alta + T 10-23°C</p>
              </article>
              <article className={`rounded-[22px] border p-4 ${pestTone(agricultural.pestRisk.oliveFlyRisk) === 'danger' ? 'border-rose-200 bg-rose-50/60' : pestTone(agricultural.pestRisk.oliveFlyRisk) === 'warning' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Mosca del olivo</p>
                <p className="mt-1 text-2xl font-black capitalize text-slate-950">{agricultural.pestRisk.oliveFlyRisk}</p>
                <p className="mt-1 text-xs text-slate-600">Activa con T 20-28°C</p>
              </article>
            </div>
          )}

          {agricultural.workability.reasons.length > 0 && (
            <div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50/60 p-3 text-sm text-rose-900">
              <p className="font-bold">Motivos operativos</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {agricultural.workability.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          <CropRequirements
            agricultural={agricultural}
            soilTemp={soil10}
            airTemp={airTemp}
            frostRisk={agricultural.frostRisk48h}
            et0CumulativeMm={agricultural.et0CumulativeMm}
            precipitacionSemanal={precipitacionSemanal}
          />
        </>
      ) : (
        <p className="mt-5 text-sm text-slate-500">Sin datos agrícolas en la respuesta actual.</p>
      )}
    </section>
  );
}
