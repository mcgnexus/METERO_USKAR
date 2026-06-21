'use client';

import { FormulaChip, fmtNumber, KpiCard } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload } from '@/types/climate';

export function EquationsBox({ data }: { data: ClimateCalibrationPayload }) {
  const inversion = data.interpolation.inversionDetected;
  const deltaH = data.extrapolation.deltaZ;
  const lapseRate = 0.0065;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Caja de ecuaciones</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Las 4 capas del modelo</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        El motor aplica una cascada de leyes físicas en orden: primero decide la estabilidad de la columna
        de aire, después transporta humedad, después calcula la demanda evaporativa y finalmente aplica
        las correcciones de microclima del llano. Cada capa alimenta la siguiente.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa 1 · Termodinámica</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${inversion ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {inversion ? 'Inversión' : 'Estándar'}
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">Gradiente adiabático + inversión nocturna</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Si T_Baza &gt; T_SanClemente, se interpola con gradiente estándar (0.65°C / 100 m). Si T_Baza &lt; T_SanClemente,
            se calcula el gradiente de inversión real entre las dos estaciones y se extrapola a 950 m.
          </p>
          <div className="mt-3 space-y-2">
            <FormulaChip label="Día (estándar)" formula={`T_llano = T_baza - ${lapseRate} * (${deltaH}) = T_baza - ${(lapseRate * deltaH).toFixed(2)}°C`} />
            <FormulaChip label="Noche (inversión)" formula={`Γ_inv = (T_san - T_baza) / 316\nT_llano = T_baza + Γ_inv * ${deltaH}`} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Resultado: γ = {fmtNumber(data.interpolation.dynamicGradientCPerM, 4)} °C/m
            ({fmtNumber(data.interpolation.dynamicGradientCPer100m, 2)} °C / 100 m)
            → T interpolada = {fmtNumber(data.interpolation.estimatedTemperatureC, 1)} °C
          </p>
        </article>

        <article className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa 2 · Higrométrica</p>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-800">
              Tetens-Magnus
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">Conservación de presión de vapor</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            La masa de vapor se conserva entre Baza y Huéscar. Se calcula la presión de vapor real en Baza
            y se recalcula la HR a la temperatura del llano. Si el viento en Baza viene del Oeste y la HR &gt; 90%,
            se aplica la penalización del Negratín (−15% de e_Baza).
          </p>
          <div className="mt-3 space-y-2">
            <FormulaChip label="Tetens (saturación)" formula={`e_s(T) = 6.112 · exp(17.67·T / (T + 243.5))`} />
            <FormulaChip label="Conservación" formula={`e_baza = e_s(T_baza) · HR_baza / 100\nHR_llano = (e_baza / e_s(T_llano)) · 100`} />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Resultado: HR estimada {fmtNumber(data.extrapolation.humidityPct, 1)}% · método{' '}
            <span className="font-mono text-[10px]">{data.extrapolation.humidityMethod}</span>
            {data.extrapolation.negratínPenaltyApplied && (
              <span className="ml-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                Negratín penalty
              </span>
            )}
          </p>
        </article>

        <article className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa 3 · Agronómica</p>
            <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-800">
              FAO-56 PM
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">Penman-Monteith horario</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Con T, HR y P corregidas al llano, más Rs interpolada (Baza↔Puebla) y u₂ con fricción de vega,
            se calcula la evapotranspiración de referencia (ETo) en mm/h. El agricultor la convierte en
            necesidad de riego multiplicando por Kc del cultivo.
          </p>
          <div className="mt-3 space-y-2">
            <FormulaChip
              label="ETo horaria"
              formula={`ETo = [0.408·Δ·Rn + γ·(37/(T+273))·u₂·(e_s - e_a)] / [Δ + γ·(1 + 0.34·u₂)]`}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Resultado: ETo hora = {fmtNumber(data.eto.etoHourlyMm, 3)} mm
            · Rn = {fmtNumber(data.eto.inputs.netRadiationMJm2h, 3)} MJ/m²h
          </p>
        </article>

        <article className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa 4 · Microclima del llano</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${data.microclimate.inversionConditions ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'}`}>
              {data.microclimate.inversionConditions ? 'Inversión activa' : 'Sin inversión'}
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">Drenaje catabático + isla de calor urbana</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            De noche, con viento &lt; 2.0 m/s, el aire frío de Sagra y Castril baja a la cubeta del llano
            (hasta −5 °C, de forma proporcional a la calma y nubosidad). La isla de calor urbana aporta
            +0.5 °C nocturnos por inercia térmica del asfalto. De día, la UHI se reduce a ~0.2 °C.
          </p>
          <div className="mt-3 space-y-2">
            <FormulaChip
              label="Corrección aplicada"
              formula={`T_calculada = T_interpolada + drenaje + isla_calor\n  = ${fmtNumber(data.interpolation.estimatedTemperatureC, 1)} + (${fmtNumber(data.microclimate.coldAirDrainageC, 1)}) + (+${fmtNumber(data.microclimate.urbanHeatIslandC, 1)})\n  = ${fmtNumber(data.interpolation.estimatedTemperatureC + data.microclimate.totalCorrectionC, 1)}°C${data.calibration.realTemperatureC !== null ? `\nT_real (sensor) = ${fmtNumber(data.calibration.realTemperatureC, 1)}°C\nResidual = ${fmtNumber(data.calibration.residualC ?? 0, 2)}°C` : ''}`}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Viento actual: {fmtNumber(data.microclimate.windSpeed2mMs, 1)} m/s ·
            hour Madrid {data.microclimate.hourMadrid}
            {data.microclimate.isNighttime && (
              <span className="ml-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">Noche</span>
            )}
          </p>
        </article>
      </div>
    </section>
  );
}
