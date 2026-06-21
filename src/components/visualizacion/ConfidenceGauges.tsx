'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

export default function ConfidenceGauges({ currentData, calibrationData }: { currentData: any; calibrationData: any }) {
  const conf = currentData?.confidencePct ?? 0;
  const warnings = calibrationData?.quality?.warnings?.length ?? 0;
  const frost = calibrationData?.dewPoint?.frostRisk ?? 'unknown';

  const frostColors: Record<string, string> = {
    none: '#10b981',
    media: '#f59e0b',
    alta: '#f97316',
    muy_alta: '#ef4444',
    unknown: '#94a3b8',
  };

  const frostLabels: Record<string, string> = {
    none: 'Sin riesgo',
    media: 'Media',
    alta: 'Alta',
    muy_alta: 'Muy alta',
    unknown: 'No disponible',
  };

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Calidad</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Fiabilidad y riesgos</h2>
          <p className="mt-1 text-sm text-slate-600">Confianza del modelo y alertas activas.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Confianza</p>
          <div className="relative mt-2 h-24 w-24">
            <Doughnut
              data={{
                datasets: [{
                  data: [conf, 100 - conf],
                  backgroundColor: [conf > 70 ? '#10b981' : conf > 40 ? '#f59e0b' : '#ef4444', '#f1f5f9'],
                  borderWidth: 0,
                }],
              }}
              options={{ responsive: true, maintainAspectRatio: true, cutout: '72%', plugins: { tooltip: { enabled: false } } }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black text-slate-950">{conf.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Helada</p>
          <div className="relative mt-2 h-24 w-24">
            <Doughnut
              data={{
                datasets: [{
                  data: frost === 'none' ? [100, 0] : frost === 'media' ? [40, 60] : frost === 'alta' ? [65, 35] : frost === 'muy_alta' ? [85, 15] : [0, 100],
                  backgroundColor: [frostColors[frost] || '#94a3b8', '#f1f5f9'],
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
            {(currentData?.alerts ?? []).length === 0 && (
              <p className="text-sm text-emerald-700">✓ Ninguna alerta activa</p>
            )}
            {(currentData?.alerts ?? []).map((a: any, i: number) => (
              <div key={i} className={`rounded-xl px-3 py-2 text-sm font-bold ${
                a.level === 'severo' ? 'bg-rose-100 text-rose-800' :
                a.level === 'peligro' ? 'bg-orange-100 text-orange-800' :
                'bg-amber-100 text-amber-800'}`}>
                {a.title}
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
