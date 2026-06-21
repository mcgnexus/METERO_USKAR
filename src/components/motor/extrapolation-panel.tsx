'use client';

import { FormulaChip, fmtNumber, KpiCard } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload } from '@/types/climate';

const G = 9.80665;
const M_AIR = 0.02896;
const R_GAS = 8.314;
const GAMMA_STD = 0.0065;
const BARO_EXPONENT = (G * M_AIR) / (R_GAS * GAMMA_STD);

function pressureMethodLabel(method: ClimateCalibrationPayload['extrapolation']['pressureMethod']): string {
  switch (method) {
    case 'barometric_from_baza_aemet': return 'Barométrica hipsométrica desde Baza (AEMET)';
    case 'barometric_from_estimated_baza': return 'Barométrica hipsométrica desde Baza (estimado)';
    case 'standard_atmosphere': return 'Atmósfera estándar ISA';
  }
}

function pressureMethodTone(method: ClimateCalibrationPayload['extrapolation']['pressureMethod']): 'success' | 'warning' | 'danger' {
  if (method === 'barometric_from_baza_aemet') return 'success';
  if (method === 'barometric_from_estimated_baza') return 'warning';
  return 'danger';
}

function humidityMethodLabel(method: ClimateCalibrationPayload['extrapolation']['humidityMethod']): string {
  switch (method) {
    case 'vapor_conservation_from_baza_aemet': return 'Conservación de vapor desde Baza (AEMET)';
    case 'vapor_conservation_from_estimated_baza': return 'Conservación de vapor desde Baza (estimado)';
    case 'negratin_advection_corrected': return 'Conservación de vapor + penalización Negratín';
    case 'unavailable': return 'Sin dato';
  }
}

export function ExtrapolationPanel({ data }: { data: ClimateCalibrationPayload }) {
  const ex = data.extrapolation;
  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Termodinámica de la columna</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">De Baza (785 m) al llano (950 m)</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        La presión atmosférica disminuye exponencialmente con la altitud. Para no usar la atmósfera
        estándar ISA (que ignora la temperatura local), aplicamos la ecuación hipsométrica completa con
        la temperatura de Baza como base. La humedad se transporta conservando la presión de vapor real.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Presión hipsométrica</p>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${pressureMethodTone(ex.pressureMethod) === 'success' ? 'bg-emerald-100 text-emerald-800' : pressureMethodTone(ex.pressureMethod) === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
              {pressureMethodTone(ex.pressureMethod) === 'success' ? 'AEMET directo' : pressureMethodTone(ex.pressureMethod) === 'warning' ? 'Estimado' : 'Sin dato'}
            </span>
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">Ecuación hipsométrica con T local</p>
          <div className="mt-3">
            <FormulaChip
              label="Fórmula"
              formula={`P_huescar = P_baza · (1 - Γ·Δz / (T_baza + 273.15))^(g·M / R·Γ)\nΓ = ${GAMMA_STD} K/m · g·M/R·Γ = ${BARO_EXPONENT.toFixed(3)}\nΔz = ${ex.deltaZ} m`}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">{pressureMethodLabel(ex.pressureMethod)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KpiCard
              label="Presión Huéscar"
              value={fmtNumber(ex.pressureHPa, 0)}
              unit="hPa"
              tone="accent"
            />
            <KpiCard
              label="Δz"
              value={ex.deltaZ.toString()}
              unit="m"
              caption={`Baza ${ex.sourceElevationM} → Huéscar ${ex.targetElevationM}`}
            />
          </div>
          {ex.rawTemperatureC !== null && (
            <p className="mt-3 text-xs text-slate-500">
              T bruta Baza: {fmtNumber(ex.rawTemperatureC, 1)} °C
              {ex.bazaWindDirectionSource && ` · Dirección viento: ${ex.bazaWindDirectionSource === 'open_meteo' ? 'Open-Meteo' : 'No disponible'}`}
            </p>
          )}
        </article>

        <article className="rounded-[22px] border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Humedad conservada</p>
            {ex.negratínPenaltyApplied ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase text-rose-800">
                Negratín penalty
              </span>
            ) : (
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase text-sky-800">
                Sin penalización
              </span>
            )}
          </div>
          <p className="mt-2 text-sm font-black text-slate-950">Tetens-Magnus + presión de vapor</p>
          <div className="mt-3">
            <FormulaChip
              label="Fórmula"
              formula={`e_s(T) = 6.112 · exp(17.67·T / (T + 243.5))\ne_baza = e_s(T_baza) · HR_baza / 100\nHR_llano = (e_baza / e_s(T_llano)) · 100`}
            />
          </div>
          <p className="mt-3 text-xs text-slate-500">{humidityMethodLabel(ex.humidityMethod)}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <KpiCard
              label="HR estimada"
              value={fmtNumber(ex.humidityPct, 1)}
              unit="%"
              tone={ex.negratínPenaltyApplied ? 'warning' : 'accent'}
            />
            <KpiCard
              label="Viento Baza"
              value={ex.bazaWindDirectionDeg !== null ? `${ex.bazaWindDirectionDeg.toFixed(0)}°` : '—'}
              caption={ex.bazaWindDirectionDeg !== null && ex.bazaWindDirectionDeg >= 225 && ex.bazaWindDirectionDeg <= 315 ? 'Componente Oeste (Negratín)' : 'Otra componente'}
              tone={ex.bazaWindDirectionDeg !== null && ex.bazaWindDirectionDeg >= 225 && ex.bazaWindDirectionDeg <= 315 ? 'warning' : 'default'}
            />
          </div>
          {ex.negratínPenaltyApplied && (
            <p className="mt-3 rounded-[18px] border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
              <strong>Advección del Negratín corregida.</strong> El viento en Baza viene del Oeste (entre 225°-315°)
              y la humedad superaba el 90%. La advección húmeda del embalse del Negratín choca contra
              el Cerro Jabalcón y no llega al llano. Se ha reducido un 15% la presión de vapor antes de
              transportarla.
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
