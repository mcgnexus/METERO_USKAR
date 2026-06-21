'use client';

import { fmtNumber, KpiCard } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload, RadiationWindReading } from '@/types/climate';

function schemeLabel(w: RadiationWindReading['radiationBlend']): string {
  if (!w) return 'Sin datos';
  if (w.foehnDetected) return 'Foehn detectado';
  if (w.anticyclone) return 'Anticiclón (IDW puro)';
  return 'Borrasca / NW (Baza-pesada)';
}

function schemeTone(w: RadiationWindReading['radiationBlend']): 'default' | 'accent' | 'warning' {
  if (!w) return 'default';
  if (w.foehnDetected) return 'warning';
  if (w.anticyclone) return 'accent';
  return 'default';
}

export function RiaFusionPanel({ rw }: { rw: ClimateCalibrationPayload['nodes']['radiationWind'] }) {
  const w = rw.radiationBlend;
  const bazaPct = w ? Math.round(w.bazaWeight * 100) : 0;
  const pueblaPct = w ? Math.round(w.pueblaWeight * 100) : 0;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Fusión RIA</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Cómo se combinan Baza y Puebla</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Baza RIA (18/1) y Puebla de Don Fadrique RIA (18/2) son las dos estaciones agroclimáticas
            oficiales en la comarca. La radiación del llano se interpola por distancia inversa al
            cuadrado, modulada por la presión barométrica de Baza y la nubosidad de Open-Meteo.
            El viento se asimila siempre desde Baza (fosa resguardada como el llano) con corrección
            por fricción del arbolado.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${schemeTone(w) === 'warning' ? 'bg-orange-100 text-orange-800' : schemeTone(w) === 'accent' ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-700'}`}>
          {schemeLabel(w)}
        </span>
      </div>

      {w && (
        <>
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Pesos de Radiación Solar</p>
            <div className="mt-3 flex h-9 w-full overflow-hidden rounded-full border border-slate-200">
              <div
                className="flex items-center justify-center bg-sky-500 text-xs font-bold text-white transition-all"
                style={{ width: `${bazaPct}%` }}
                title={`Baza RIA: ${bazaPct}%`}
              >
                {bazaPct >= 12 ? `Baza ${bazaPct}%` : ''}
              </div>
              <div
                className="flex items-center justify-center bg-amber-500 text-xs font-bold text-white transition-all"
                style={{ width: `${pueblaPct}%` }}
                title={`Puebla RIA: ${pueblaPct}%`}
              >
                {pueblaPct >= 12 ? `Puebla ${pueblaPct}%` : ''}
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>Baza (fosa, 785 m, 42 km)</span>
              <span>Puebla (piedmont La Sagra, 1160 m, 20 km)</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Radiación Baza RIA"
              value={w.bazaRadiationMJm2 !== null ? w.bazaRadiationMJm2.toFixed(1) : '—'}
              unit="MJ/m²·d"
              caption="Estación 18/1"
            />
            <KpiCard
              label="Radiación Puebla RIA"
              value={w.pueblaRadiationMJm2 !== null ? w.pueblaRadiationMJm2.toFixed(1) : '—'}
              unit="MJ/m²·d"
              caption="Estación 18/2"
            />
            <KpiCard
              label="Presión AEMET Baza"
              value={w.bazaPressureHPa !== null ? w.bazaPressureHPa.toFixed(0) : '—'}
              unit="hPa"
              caption={w.bazaPressureHPa !== null && w.bazaPressureHPa >= 925 ? 'Anticiclón' : w.bazaPressureHPa !== null ? 'Borrasca' : 'Sin dato'}
              tone={w.bazaPressureHPa !== null && w.bazaPressureHPa >= 925 ? 'accent' : 'default'}
            />
            <KpiCard
              label="Nubosidad Open-Meteo"
              value={w.cloudCoverPct !== null ? w.cloudCoverPct.toFixed(0) : '—'}
              unit="%"
              caption={w.cloudCoverPct !== null && w.cloudCoverPct >= 60 ? 'Sospecha Foehn' : 'Cielo claro'}
              tone={w.cloudCoverPct !== null && w.cloudCoverPct >= 60 ? 'warning' : 'default'}
            />
          </div>
        </>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <KpiCard
          label="Radiación media aplicada"
          value={fmtNumber(rw.solarRadiationWm2, 0)}
          unit="W/m²"
          caption={`Fuente: ${rw.stationName ?? rw.source}`}
          tone="accent"
        />
        <KpiCard
          label="Viento asimilado (Baza × fricción)"
          value={fmtNumber(rw.windSpeed2mKmh, 1)}
          unit="km/h"
          caption={`Origen: ${rw.windSource ?? 'sin dato'}`}
        />
      </div>

      <p className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        <strong className="text-slate-800">Por qué no se usa Puebla para viento.</strong> Puebla está a
        1160 m, expuesta a vientos sinópticos y ráfagas catabáticas que bajan de La Sagra. Su anemómetro
        sobreestima el régimen eólico de la vega. Baza (785 m, fosa resguardada) es un proxy mucho más
        fiel. Aun así, Baza se reduce por <code className="rounded bg-white px-1.5 py-0.5">vega_friction_factor</code>
        {' '}(0.85) para reflejar la fricción del arbolado local.
      </p>
    </section>
  );
}
