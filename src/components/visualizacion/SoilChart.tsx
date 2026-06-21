'use client';

import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="relative overflow-hidden" style={{ height }}>{children}</div>;
}

export default function SoilChart({ forecastData }: { forecastData: any }) {
  const forecastDays = forecastData?.forecastDays ?? [];
  const labels = forecastDays.map((d: any) =>
    new Date(d.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
  const soil10 = forecastDays.map((d: any) => d.dailySummary?.soilTemp10cmMeanC);
  const soil40 = forecastDays.map((d: any) => d.dailySummary?.soilTemp40cmMeanC);
  const eto = forecastDays.map((d: any) => d.dailySummary?.et0TotalMm);
  const radiation = forecastDays.map((d: any) => d.dailySummary?.radiationTotalMJm2);

  const hasSoil = soil10.some((v: any) => v != null);
  const hasEto = eto.some((v: any) => v != null);
  const hasRad = radiation.some((v: any) => v != null);

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Suelo y energía</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Temperatura del suelo, radiación y ETo</h2>
          <p className="mt-1 text-sm text-slate-600">Datos diarios pronosticados (Open-Meteo corregido).</p>
        </div>
      </div>

      {hasSoil && (
        <div className="mt-5">
          <ChartBox height={224}>
            <Line
              data={{
                labels,
                datasets: [
                  {
                    label: 'Suelo 10 cm',
                    data: soil10,
                    borderColor: '#d97706',
                    backgroundColor: 'rgba(217,119,6,0.08)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    borderWidth: 2,
                  },
                  {
                    label: 'Suelo 40 cm',
                    data: soil40,
                    borderColor: '#92400e',
                    borderDash: [4, 4],
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
                  y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: '°C', font: { size: 10 } } },
                },
              }}
            />
          </ChartBox>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {hasEto && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">ETo (mm/día)</p>
            <ChartBox height={192}>
              <Bar
                data={{
                  labels,
                  datasets: [{
                    label: 'ETo',
                    data: eto,
                    backgroundColor: 'rgba(59,130,246,0.5)',
                    borderColor: '#3b82f6',
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
        {hasRad && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Radiación solar (MJ/m²)</p>
            <ChartBox height={192}>
              <Bar
                data={{
                  labels,
                  datasets: [{
                    label: 'Radiación',
                    data: radiation,
                    backgroundColor: 'rgba(245,158,11,0.5)',
                    borderColor: '#f59e0b',
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
      </div>
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/forecast &mdash; Open-Meteo corregido</p>
    </section>
  );
}
