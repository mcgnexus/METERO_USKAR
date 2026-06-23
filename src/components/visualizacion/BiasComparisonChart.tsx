'use client';

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { ForecastPayload } from '@/hooks/useForecast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function BiasComparisonChart({ forecastData }: { forecastData: ForecastPayload | null | undefined }) {
  const biasCorrection = forecastData?.biasCorrection;
  if (!biasCorrection?.sampleCount) return null;

  const labels = ['Dia', 'Noche', 'Todo'];
  const allBias = [
    biasCorrection.temperature?.day ?? 0,
    biasCorrection.temperature?.night ?? 0,
    biasCorrection.temperature?.all ?? 0,
  ];

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Sesgo</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Correccion del pronostico</h2>
          <p className="mt-1 text-sm text-slate-600">Sesgo calculado contra datos reales de los ultimos 30 dias.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sesgo de temperatura (C)</p>
          <div className="relative overflow-hidden" style={{ height: 224 }}>
            <Bar
              data={{
                labels,
                datasets: [{
                  label: 'Sesgo',
                  data: allBias,
                  backgroundColor: allBias.map((value) => value > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'),
                  borderColor: allBias.map((value) => value > 0 ? '#ef4444' : '#3b82f6'),
                  borderWidth: 1,
                  borderRadius: 4,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                  y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                },
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Humedad', value: biasCorrection.humidity ?? 0, unit: '%' },
            { label: 'Viento', value: biasCorrection.wind ?? 0, unit: 'km/h' },
            { label: 'Radiacion', value: biasCorrection.radiation ?? 0, unit: 'W/m2' },
          ].map((metric) => (
            <div key={metric.label} className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
              <p className={`mt-1 text-xl font-black ${Math.abs(metric.value) < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {metric.value > 0 ? '+' : ''}{metric.value.toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-500">{metric.unit}</p>
            </div>
          ))}
          <div className="col-span-3 flex items-center justify-center rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              Basado en <strong className="text-slate-900">{biasCorrection.sampleCount}</strong> muestras de validacion
            </p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/forecast &mdash; Validacion contra datos reales (30d)</p>
    </section>
  );
}
