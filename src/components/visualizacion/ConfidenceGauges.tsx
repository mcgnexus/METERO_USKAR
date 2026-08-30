'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherAlert, WeatherPayload } from '@/types/weather';
import { aemetStatusLabel, localStationsStatusLabel, primarySourceLabel, qualityLabel } from '@/lib/dataQuality';

ChartJS.register(ArcElement, Tooltip);

type FrostRisk = NonNullable<ClimateCalibrationPayload['dewPoint']['frostRisk']>;

const frostColors: Record<FrostRisk, string> = {
  none: '#10b981',
  media: '#f59e0b',
  alta: '#f97316',
  muy_alta: '#ef4444',
  unknown: '#94a3b8',
};

const frostLabels: Record<FrostRisk, string> = {
  none: 'Sin riesgo',
  media: 'Media',
  alta: 'Alta',
  muy_alta: 'Muy alta',
  unknown: 'No disponible',
};

export default function ConfidenceGauges({
  currentData,
  calibrationData,
}: {
  currentData: WeatherPayload | null | undefined;
  calibrationData: ClimateCalibrationPayload | null | undefined;
}) {
  const quality = currentData?.dataQuality;
  const warnings = calibrationData?.quality.warnings.length ?? 0;
  const frost: FrostRisk = calibrationData?.dewPoint.frostRisk ?? 'unknown';
  const alerts: WeatherAlert[] = currentData?.alerts ?? [];

  const qualityColor = quality?.quality === 'buena' ? '#10b981' : quality?.quality === 'media' ? '#f59e0b' : '#ef4444';

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Calidad</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Fiabilidad y riesgos</h2>
          <p className="mt-1 text-sm text-slate-600">Calidad del dato y alertas activas.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Calidad de los datos</p>
          <p className="mt-2 text-3xl font-black" style={{ color: qualityColor }}>
            {quality ? qualityLabel(quality.quality) : '—'}
          </p>
          <p className="mt-1 text-center text-[11px] leading-4 text-slate-500">
            {quality ? primarySourceLabel(quality.primarySource) : 'Sin fuente'} · {quality ? quality.activeSourceCount : 0} fuente(s)
          </p>
          <div className="mt-3 w-full space-y-1 text-left">
            <p className="text-[10px] text-slate-500">AEMET: <span className="font-semibold text-slate-700">{quality ? aemetStatusLabel(quality.aemet) : '—'}</span></p>
            <p className="text-[10px] text-slate-500">Locales: <span className="font-semibold text-slate-700">{quality ? localStationsStatusLabel(quality.localStations) : '—'}</span></p>
          </div>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Helada</p>
          <div className="relative mt-2 h-24 w-24">
            <Doughnut
              data={{
                datasets: [{
                  data: frost === 'none' ? [100, 0] : frost === 'media' ? [40, 60] : frost === 'alta' ? [65, 35] : frost === 'muy_alta' ? [85, 15] : [0, 100],
                  backgroundColor: [frostColors[frost], '#f1f5f9'],
                  borderWidth: 0,
                }],
              }}
              options={{ responsive: true, maintainAspectRatio: true, cutout: '72%', plugins: { tooltip: { enabled: false } } }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-center">
                <span className="text-lg font-black" style={{ color: frostColors[frost] }}>
                  {frost === 'none' ? '✓' : '⚠'}
                </span>
              </span>
            </div>
          </div>
          <p className="mt-1 text-[11px] font-bold" style={{ color: frostColors[frost] }}>{frostLabels[frost]}</p>
        </div>

        <div className="col-span-2 flex flex-col justify-center rounded-2xl border border-slate-100 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Alertas activas</p>
          <div className="mt-3 space-y-2">
            {alerts.length === 0 && (
              <p className="text-sm text-emerald-700">âœ“ Ninguna alerta activa</p>
            )}
            {alerts.map((alert, index) => (
              <div
                key={`${alert.title}-${index}`}
                className={`rounded-xl px-3 py-2 text-sm font-bold ${
                  alert.level === 'severo' ? 'bg-rose-100 text-rose-800' :
                  alert.level === 'peligro' ? 'bg-orange-100 text-orange-800' :
                  'bg-amber-100 text-amber-800'
                }`}
              >
                {alert.title}
              </div>
            ))}
          </div>
          {warnings > 0 && (
            <p className="mt-2 text-xs text-amber-600">{warnings} advertencia(s) de calidad</p>
          )}
        </div>
      </div>
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/current + /api/weather/climate-calibration</p>
    </section>
  );
}
