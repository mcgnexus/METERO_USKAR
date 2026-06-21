'use client';

import { fmtNumber, KpiCard } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload } from '@/types/climate';

export function ExoticBlock({ data, airTempC }: { data: ClimateCalibrationPayload; airTempC: number | null }) {
  const x = data.exoticVariables;
  const soil10 = x.soilTemp10cmC;
  const soil40 = x.soilTemp40cmC;
  const air = airTempC;
  const delta10 = soil10 !== null && air !== null ? soil10 - air : null;
  const delta40 = soil40 !== null && air !== null ? soil40 - air : null;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Variables de Open-Meteo</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">Suelo y nubosidad</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Open-Meteo modela variables que ni AEMET ni RIA miden en tiempo real. La temperatura del suelo
        a 10 cm y 40 cm es clave para siembra y asimilación de nitrógeno. La nubosidad alimenta la
        detección automática de Foehn (≥ 60% nubosidad + retención orográfica en La Sagra).
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="T suelo 10 cm"
          value={fmtNumber(soil10, 1)}
          unit="°C"
          caption={delta10 !== null ? `Δ vs aire: ${delta10 > 0 ? '+' : ''}${delta10.toFixed(1)} °C` : 'Sin sensor de suelo propio para cruzar'}
          tone="accent"
        />
        <KpiCard
          label="T suelo 40 cm"
          value={fmtNumber(soil40, 1)}
          unit="°C"
          caption={delta40 !== null ? `Δ vs aire: ${delta40 > 0 ? '+' : ''}${delta40.toFixed(1)} °C (inercia térmica mayor)` : 'Sin sensor'}
        />
        <KpiCard
          label="Nubosidad total"
          value={fmtNumber(x.cloudCoverPct, 0)}
          unit="%"
          caption={x.cloudCoverPct !== null && x.cloudCoverPct >= 60 ? 'Posible Foehn activo' : 'Cielo claro o mixto'}
          tone={x.cloudCoverPct !== null && x.cloudCoverPct >= 60 ? 'warning' : 'default'}
        />
      </div>

      <p className="mt-5 rounded-[18px] border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        Fuente: <code className="rounded bg-white px-1.5 py-0.5">api.open-meteo.com</code> · Capas{' '}
        <code className="rounded bg-white px-1.5 py-0.5">soil_temperature_0_to_7cm</code> (proxy 10 cm) y{' '}
        <code className="rounded bg-white px-1.5 py-0.5">soil_temperature_28_to_100cm</code> (proxy 40 cm). Cache 30 min.
      </p>
    </section>
  );
}
