'use client';

import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';
import type { ForecastPayload } from '@/types/forecast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

function fmtHour(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }) + ' ' + date.toLocaleTimeString('es-ES', { hour: '2-digit' }) + 'h';
}

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="relative overflow-hidden" style={{ height }}>{children}</div>;
}

export default function WindChart({ forecastData }: { forecastData: ForecastPayload | null | undefined }) {
  const forecastDays = forecastData?.forecastDays ?? [];
  const allHours = forecastDays.flatMap((day) => day.hours ?? []);
  const visibleHours = allHours.slice(0, 72);
  const times = visibleHours.map((hour) => fmtHour(hour.time));
  const wind10m = visibleHours.map((hour) => hour.windSpeed10mKmh);
  const wind2m = visibleHours.map((hour) => hour.windSpeed2mKmh);

  const dailySummaries = forecastDays.map((day) => day.dailySummary);
  const dayLabels = forecastDays.map((day) => new Date(day.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
  const windMean = dailySummaries.map((summary) => summary.windMeanKmh);

  const hasHourly = times.length > 0 && wind10m.some((value) => value != null);
  const hasDaily = dayLabels.length > 0 && windMean.some((value) => value != null);

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Viento</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Velocidad y rafagas</h2>
          <p className="mt-1 text-sm text-slate-600">Viento a 10 m y 2 m de altura (corregido).</p>
        </div>
      </div>

      {hasHourly && (
        <div className="mt-5">
          <ChartBox height={256}>
            <Line
              data={{
                labels: times,
                datasets: [
                  {
                    label: 'Viento 10 m',
                    data: wind10m,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 1,
                    pointHoverRadius: 4,
                    borderWidth: 2,
                  },
                  {
                    label: 'Viento 2 m',
                    data: wind2m,
                    borderColor: '#6ee7b7',
                    borderDash: [4, 4],
                    tension: 0.3,
                    pointRadius: 1,
                    pointHoverRadius: 4,
                    borderWidth: 1.5,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
                },
                scales: {
                  x: { ticks: { maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
                  y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'km/h', font: { size: 10 } } },
                },
              }}
            />
          </ChartBox>
        </div>
      )}

      {hasDaily && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Viento medio diario</p>
          <ChartBox height={192}>
            <Bar
              data={{
                labels: dayLabels,
                datasets: [{
                  label: 'Viento medio',
                  data: windMean,
                  backgroundColor: 'rgba(16,185,129,0.5)',
                  borderColor: '#10b981',
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
                  y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                },
              }}
            />
          </ChartBox>
        </div>
      )}
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/forecast &mdash; Open-Meteo corregido por sesgo</p>
    </section>
  );
}
