'use client';

import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
}

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="relative overflow-hidden" style={{ height }}>{children}</div>;
}

export default function TemperatureChart({ currentData, forecastData }: { currentData: any; forecastData: any }) {
  const hourly = currentData?.hourly;
  const daily = currentData?.daily;

  const hourlyTimes = hourly?.time?.slice(0, 48) ?? [];
  const hourlyTemps = hourly?.temperatureC?.slice(0, 48) ?? [];

  const dailyLabels = daily?.time?.map(fmtDay) ?? [];
  const dailyMax = daily?.temperatureMaxC ?? [];
  const dailyMin = daily?.temperatureMinC ?? [];

  const hasHourly = hourlyTimes.length > 0 && hourlyTemps.length > 0;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Temperatura</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Evolución térmica</h2>
          <p className="mt-1 text-sm text-slate-600">48 horas hora a hora + mín/máx diarias (7 días).</p>
        </div>
      </div>

      <div className="mt-5">
        {hasHourly && (
          <ChartBox height={288}>
            <Line
              data={{
                labels: hourlyTimes.map((t: string) => fmtHour(t)),
                datasets: [{
                  label: 'Temperatura',
                  data: hourlyTemps,
                  borderColor: '#f97316',
                  backgroundColor: (ctx) => {
                    const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    g.addColorStop(0, 'rgba(249,115,22,0.3)');
                    g.addColorStop(1, 'rgba(249,115,22,0.01)');
                    return g;
                  },
                  fill: true,
                  tension: 0.3,
                  pointRadius: 2,
                  pointHoverRadius: 5,
                  borderWidth: 2,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
                  y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                },
              }}
            />
          </ChartBox>
        )}
        {!hasHourly && <p className="text-sm text-slate-500">Datos horarios no disponibles.</p>}
      </div>

      {dailyLabels.length > 0 && (
        <div className="mt-6">
          <ChartBox height={224}>
            <Line
              data={{
                labels: dailyLabels,
                datasets: [
                  {
                    label: 'Máxima',
                    data: dailyMax,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    fill: '-1',
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                  },
                  {
                    label: 'Mínima',
                    data: dailyMin,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59,130,246,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2,
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
                  x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                  y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                },
              }}
            />
          </ChartBox>
        </div>
      )}
    </section>
  );
}
