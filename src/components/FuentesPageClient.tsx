'use client';

import { NavBottom } from '@/components/NavBottom';
import { fmtHourMadrid } from '@/lib/timezone';
import { aemetStatusLabel, localStationsStatusLabel, primarySourceLabel, qualityLabel } from '@/lib/dataQuality';
import type { WeatherPayload } from '@/types/weather';
import type { ClimateCalibrationPayload } from '@/types/climate';

const SOURCE_COLORS: Record<string, string> = {
  OK: 'bg-emerald-500',
  DEGRADED: 'bg-amber-400',
  ERROR: 'bg-red-500',
};

export function FuentesPageClient({
  initialWeatherData,
  initialClimateData,
}: {
  initialWeatherData: WeatherPayload | null;
  initialClimateData: ClimateCalibrationPayload | null;
}) {
  const wd = initialWeatherData;
  const cd = initialClimateData;

  const sourceHealth = wd?.sourceHealth ?? [];

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Fuentes y fiabilidad</h1>
        </header>

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-3">🔗 Fuentes de datos</h2>
            {sourceHealth.length === 0 ? (
              <p className="text-sm text-slate-500">No hay información de fuentes disponible.</p>
            ) : (
              <div className="space-y-3">
                {sourceHealth.map((sh, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SOURCE_COLORS[sh.status] ?? 'bg-slate-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">{sh.source}</p>
                      <p className="text-xs text-slate-500">{sh.message}</p>
                      {sh.dataAgeMinutes != null && (
                        <p className="text-[10px] text-slate-600 mt-0.5" suppressHydrationWarning>
                          Datos de hace {sh.dataAgeMinutes} min · {sh.checkedAt ? fmtHourMadrid(sh.checkedAt) : '—'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {wd?.dataQuality && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-3">📊 Calidad de los datos</h2>
              <div className="space-y-2">
                <QualityRow label="Calidad de los datos" value={qualityLabel(wd.dataQuality.quality)} />
                <QualityRow label="Fuente principal" value={primarySourceLabel(wd.dataQuality.primarySource)} />
                <QualityRow label="AEMET" value={aemetStatusLabel(wd.dataQuality.aemet)} />
                <QualityRow label="Estaciones locales" value={localStationsStatusLabel(wd.dataQuality.localStations)} />
                <QualityRow label="Fuentes activas" value={String(wd.dataQuality.activeSourceCount)} />
              </div>
              {wd.dataQuality.explanation && (
                <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600">
                  {wd.dataQuality.explanation}
                </p>
              )}
            </section>
          )}

          {cd?.calibration?.realTemperatureC != null && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-3">⚙️ Calibración local</h2>
              <div className="space-y-2 text-sm">
                <Row label="Temperatura estimada" value={`${cd.calibration.realTemperatureC != null ? cd.calibration.realTemperatureC.toFixed(1) + '°C' : '—'}`} />
                <Row label="Corrección microclima" value={`${cd.microclimate.totalCorrectionC.toFixed(2)}°C`} />
                <Row label="Factor ráfagas" value={cd.microclimate.windGustReductionFactor.toFixed(2)} />
                <Row label="Elevación" value={`${cd.nodes.localStation?.elevationM ?? '—'} m`} />
              </div>
            </section>
          )}

          <div className="text-center pb-4">
            <a href="/huescar" className="text-[11px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-800">
              ← Volver al inicio
            </a>
          </div>
        </div>
      </div>
      <NavBottom />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}
