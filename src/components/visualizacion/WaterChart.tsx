'use client';

import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
}

export default function WaterChart({ currentData, forecastData }: { currentData: any; forecastData: any }) {
  const daily = currentData?.daily;
  const hourly = currentData?.hourly;

  const labels = daily?.time?.map(fmtDay) ?? [];
  const precip = daily?.precipitationSumMm ?? [];
  const prob = daily?.precipitationProbabilityPct ?? [];

  const hourLabels = hourly?.time?.slice(0, 72).map((t: string) =>
    new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })) ?? [];
  const humidities = hourly?.humidityPct?.slice(0, 72) ?? [];

  const hasPrecip = labels.length > 0 && precip.length > 0;
  const hasHum = hourLabels.length > 0 && humidities.length > 0;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Agua</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Precipitación y humedad</h2>
          <p className="mt-1 text-sm text-slate-600">Acumulados diarios y humedad relativa.</p>
        </div>
      </div>

      {hasPrecip && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="h-56">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Precipitación (mm)</p>
            <Bar
              data={{
                labels,
                datasets: [{
                  label: 'mm',
                  data: precip,
                  backgroundColor: 'rgba(14,165,233,0.6)',
                  borderColor: '#0ea5e9',
                  borderWidth: 1,
                  borderRadius: 4,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                  y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                },
              }}
            />
          </div>
          <div className="h-56">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Probabilidad de lluvia (%)</p>
            <Line
              data={{
                labels,
                datasets: [{
                  label: '%',
                  data: prob,
                  borderColor: '#f59e0b',
                  backgroundColor: 'rgba(245,158,11,0.15)',
                  fill: true,
                  tension: 0.3,
                  pointRadius: 3,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                  y: { min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                },
              }}
            />
          </div>
        </div>
      )}

      {hasHum && (
        <div className="mt-6 h-56">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Humedad relativa (%) — 72 horas</p>
          <Line
            data={{
              labels: hourLabels,
              datasets: [{
                label: 'HR',
                data: humidities,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14,165,233,0.12)',
                fill: true,
                tension: 0.3,
                pointRadius: 1,
                pointHoverRadius: 4,
                borderWidth: 2,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
                y: { min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
              },
            }}
          />
        </div>
      )}
    </section>
  );
}
