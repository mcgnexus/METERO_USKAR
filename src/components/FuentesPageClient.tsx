'use client';

import { NavBottom } from '@/components/NavBottom';
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
      <div className="mx-auto max-w-lg px-4 pt-4" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
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
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Datos de hace {sh.dataAgeMinutes} min · {sh.checkedAt ? new Date(sh.checkedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {wd?.confidencePct != null && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-3">📊 Confianza global</h2>
              <div className="flex items-center gap-3">
                <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-emerald-400 to-emerald-600 transition-all"
                    style={{ width: `${Math.min(wd.confidencePct, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-black text-slate-800">{wd.confidencePct.toFixed(0)}%</span>
              </div>
              {wd.confidenceExplanation && (
                <p className="mt-2 text-xs text-slate-600">{wd.confidenceExplanation}</p>
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
