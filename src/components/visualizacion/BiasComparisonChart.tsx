'use client';

import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function BiasComparisonChart({ forecastData }: { forecastData: any }) {
  const bc = forecastData?.biasCorrection;
  if (!bc?.sampleCount) return null;

  const labels = ['Día', 'Noche', 'Todo'];
  const allBias = [bc.temperature?.day ?? 0, bc.temperature?.night ?? 0, bc.temperature?.all ?? 0];
  const absBias = allBias.map(Math.abs);

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Sesgo</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Corrección del pronóstico</h2>
          <p className="mt-1 text-sm text-slate-600">Sesgo calculado contra datos reales de los últimos 30 días.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sesgo de temperatura (°C)</p>
          <div className="relative overflow-hidden" style={{ height: 224 }}>
            <Bar
              data={{
                labels,
                datasets: [{
                  label: 'Sesgo',
                  data: allBias,
                  backgroundColor: allBias.map((v: number) => v > 0 ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'),
                  borderColor: allBias.map((v: number) => v > 0 ? '#ef4444' : '#3b82f6'),
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
            { label: 'Humedad', value: bc.humidity ?? 0, unit: '%' },
            { label: 'Viento', value: bc.wind ?? 0, unit: 'km/h' },
            { label: 'Radiación', value: bc.radiation ?? 0, unit: 'W/m²' },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{m.label}</p>
              <p className={`mt-1 text-xl font-black ${Math.abs(m.value) < 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {m.value > 0 ? '+' : ''}{m.value.toFixed(1)}
              </p>
              <p className="text-[10px] text-slate-500">{m.unit}</p>
            </div>
          ))}
          <div className="col-span-3 flex items-center justify-center rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-600">
              Basado en <strong className="text-slate-900">{bc.sampleCount}</strong> muestras de validación
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
