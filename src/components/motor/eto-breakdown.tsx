'use client';

import { FormulaChip, fmtNumber, KpiCard } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload } from '@/types/climate';

export function EtoBreakdown({ data, dewPointC }: { data: ClimateCalibrationPayload; dewPointC: number | null }) {
  const e = data.eto;
  const i = e.inputs;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Demanda evaporativa</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Penman-Monteith FAO-56 horaria</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        La ETo se calcula con los valores ya corregidos para el llano: T (capas 1-4), HR (capa 2), P
        (hipsométrica desde Baza), Rs (fusión RIA) y u₂ (Baza con fricción de vega). El agricultor
        multiplica este valor por el Kc de su cultivo para obtener la necesidad de riego real.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="ETo horaria"
          value={fmtNumber(e.etoHourlyMm, 3)}
          unit="mm"
          caption={e.method === 'FAO56_HOURLY_PM' ? 'FAO-56 Penman-Monteith' : ''}
          tone="accent"
        />
        <KpiCard
          label="Radiación neta"
          value={fmtNumber(i.netRadiationMJm2h, 3)}
          unit="MJ/m²h"
          caption="Rn = 0.77 · Rs (simplificado)"
        />
        <KpiCard
          label="Viento 2m"
          value={fmtNumber(i.windSpeed2mMs, 2)}
          unit="m/s"
          caption="Convertido desde km/h con factor 0.748"
        />
        <KpiCard
          label="Temperatura"
          value={fmtNumber(i.temperatureC, 1)}
          unit="°C"
          caption="T del sensor propio o estimada"
        />
        <KpiCard
          label="Humedad"
          value={fmtNumber(i.humidityPct, 0)}
          unit="%"
          caption={dewPointC !== null ? `Punto de rocío: ${fmtNumber(dewPointC, 1)}°C` : 'Sin dato de rocío'}
        />
        <KpiCard
          label="Presión"
          value={fmtNumber(i.pressureKPa, 2)}
          unit="kPa"
          caption="De barométrica hipsométrica"
        />
      </div>

      <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-950 p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Fórmula</p>
        <p className="mt-2 overflow-x-auto whitespace-pre font-mono text-xs leading-6">
{`ETo = [ 0.408 · Δ · Rn + γ · (37 / (T + 273)) · u₂ · (e_s - e_a) ]
       ─────────────────────────────────────────────────────────
       Δ + γ · (1 + 0.34 · u₂)

Δ     = pendiente de la curva de saturación (kPa/°C)
γ     = constante psicrométrica = 0.000665 · P (kPa)
e_s   = presión de vapor de saturación a T
e_a   = presión de vapor real a T y HR`}
        </p>
      </div>
    </section>
  );
}
