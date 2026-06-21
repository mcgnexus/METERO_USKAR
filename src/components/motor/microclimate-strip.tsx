'use client';

import { fmtNumber, KpiCard } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload } from '@/types/climate';

function sign(n: number): string {
  if (n > 0) return `+${n.toFixed(1)}`;
  if (n < 0) return n.toFixed(1);
  return '±0.0';
}

export function MicroclimateStrip({ data }: { data: ClimateCalibrationPayload }) {
  const m = data.microclimate;
  const raw = m.rawInterpolatedTempC;
  const corrected = data.calibration.realTemperatureC ?? raw + m.totalCorrectionC;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Microclima local</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Lo que el gradiente no ve</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        El llano de Huéscar está en una cubeta topográfica. De noche, el aire frío de Sagra y Castril
        fluye ladera abajo y se estanca. De día, el casco urbano aporta calor antropogénico. La capa 4
        del modelo corrige ambos efectos antes de devolver la temperatura final.
      </p>

      <div className="mt-5 flex flex-wrap items-stretch gap-2">
        <div className="flex flex-1 min-w-[150px] flex-col items-center justify-center rounded-[22px] border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Interpolación</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{fmtNumber(raw, 1)}°C</p>
          <p className="mt-1 text-xs text-slate-500">Capa 1-3 aplicadas</p>
        </div>

        <div className="flex items-center text-2xl font-bold text-slate-400">+</div>

        <div className={`flex flex-1 min-w-[150px] flex-col items-center justify-center rounded-[22px] border p-5 text-center ${m.coldAirDrainageC < 0 ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Drenaje catabático</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{sign(m.coldAirDrainageC)}°C</p>
          <p className="mt-1 text-xs text-slate-500">
            {m.inversionConditions ? 'Activo: viento < 1.5 m/s' : 'Inactivo'}
          </p>
        </div>

        <div className="flex items-center text-2xl font-bold text-slate-400">+</div>

        <div className={`flex flex-1 min-w-[150px] flex-col items-center justify-center rounded-[22px] border p-5 text-center ${m.urbanHeatIslandC > 0 ? 'border-orange-200 bg-orange-50' : 'border-slate-200 bg-slate-50'}`}>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Isla de calor urbana</p>
          <p className="mt-2 text-3xl font-black text-slate-950">+{fmtNumber(m.urbanHeatIslandC, 1)}°C</p>
          <p className="mt-1 text-xs text-slate-500">
            {m.isNighttime ? 'Noche: desactivado' : 'Día: asfalto + edificios'}
          </p>
        </div>

        <div className="flex items-center text-2xl font-bold text-slate-400">=</div>

        <div className="flex flex-1 min-w-[150px] flex-col items-center justify-center rounded-[22px] border border-emerald-300 bg-emerald-50 p-5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">T final del llano</p>
          <p className="mt-2 text-3xl font-black text-emerald-900">{fmtNumber(corrected, 1)}°C</p>
          <p className="mt-1 text-xs text-emerald-700">Auditada vs sensor propio</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Viento 2m"
          value={fmtNumber(m.windSpeed2mMs, 1)}
          unit="m/s"
          caption={`Umbral inversión: 1.5 m/s`}
        />
        <KpiCard
          label="Reducción humedad embalse"
          value={`${m.reservoirHumidityReductionPct.toFixed(0)}%`}
          caption="Bias restado a la HR por influencia del embalse de San Clemente"
        />
        <KpiCard
          label="Foehn · Lluvia"
          value={m.rainfallFoehnFactor.toFixed(2)}
          caption={`El llano recibe ${Math.round(m.rainfallFoehnFactor * 100)}% de lluvia vs San Clemente`}
          tone={m.rainfallFoehnFactor < 0.6 ? 'warning' : 'default'}
        />
      </div>
    </section>
  );
}
