'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import type { WeatherPayload } from '@/types/weather';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
}

function fmtN(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="relative overflow-hidden" style={{ height }}>{children}</div>;
}

export default function TemperatureChart({ currentData }: { currentData: WeatherPayload | null | undefined }) {
  const [range, setRange] = useState<24 | 48 | 168>(48);
  const hourly = currentData?.hourly;
  const daily = currentData?.daily;

  const hourlyTimes = hourly?.time.slice(0, range) ?? [];
  const hourlyTemps = hourly?.temperatureC.slice(0, range) ?? [];

  const dailyLabels = daily?.time.map(fmtDay) ?? [];
  const dailyMax = daily?.temperatureMaxC ?? [];
  const dailyMin = daily?.temperatureMinC ?? [];

  const hasHourly = hourlyTimes.length > 0 && hourlyTemps.length > 0;
  const maxTemp = hasHourly ? Math.max(...hourlyTemps) : null;
  const minTemp = hasHourly ? Math.min(...hourlyTemps) : null;
  const maxIndex = maxTemp !== null ? hourlyTemps.indexOf(maxTemp) : -1;
  const minIndex = minTemp !== null ? hourlyTemps.indexOf(minTemp) : -1;
  const criticalHours = hourlyTemps.filter((temp) => temp >= 32).length;

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Temperatura</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Evolucion termica</h2>
          <p className="mt-1 text-sm text-slate-600">Toca la línea para ver detalle. Los puntos grandes marcan máxima y mínima.</p>
        </div>
        <div className="flex rounded-full bg-slate-100 p-1 text-xs font-bold text-slate-700">
          {([24, 48, 168] as const).map((hours) => (
            <button
              key={hours}
              type="button"
              onClick={() => setRange(hours)}
              className={`rounded-full px-3 py-1.5 transition ${range === hours ? 'bg-slate-950 text-white' : 'hover:bg-white'}`}
            >
              {hours === 168 ? '7 días' : `${hours} h`}
            </button>
          ))}
        </div>
      </div>

      {hasHourly && (
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-2xl bg-orange-50 p-3 text-orange-900"><span className="font-bold">Máxima</span><br />{fmtN(maxTemp, 1)}°C · {maxIndex >= 0 ? fmtHour(hourlyTimes[maxIndex]) : '--'}</div>
          <div className="rounded-2xl bg-sky-50 p-3 text-sky-900"><span className="font-bold">Mínima</span><br />{fmtN(minTemp, 1)}°C · {minIndex >= 0 ? fmtHour(hourlyTimes[minIndex]) : '--'}</div>
          <div className="rounded-2xl bg-rose-50 p-3 text-rose-900"><span className="font-bold">Calor fuerte</span><br />{criticalHours > 0 ? `${criticalHours} h por encima de 32°C` : 'Sin horas críticas'}</div>
        </div>
      )}

      <div className="mt-5">
        {hasHourly && (
          <ChartBox height={288}>
            <Line
              data={{
                labels: hourlyTimes.map(fmtHour),
                datasets: [{
                  label: 'Temperatura',
                  data: hourlyTemps,
                  borderColor: '#f97316',
                    backgroundColor: (ctx) => {
                      const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
                      gradient.addColorStop(0, 'rgba(249,115,22,0.3)');
                      gradient.addColorStop(1, 'rgba(249,115,22,0.01)');
                      return gradient;
                    },
                    fill: true,
                    tension: 0.3,
                    pointRadius: (ctx) => ctx.dataIndex === maxIndex || ctx.dataIndex === minIndex ? 6 : 2,
                    pointHoverRadius: 5,
                    pointBackgroundColor: (ctx) => {
                      const value = hourlyTemps[ctx.dataIndex];
                      if (ctx.dataIndex === maxIndex) return '#dc2626';
                      if (ctx.dataIndex === minIndex) return '#2563eb';
                      return value >= 32 ? '#f97316' : '#fbbf24';
                    },
                    borderWidth: 2,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      afterLabel: (ctx) => Number(ctx.parsed.y) >= 32 ? 'Hora de calor fuerte' : '',
                    },
                  },
                },
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
                    label: 'Maxima',
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
                    label: 'Minima',
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
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/current &mdash; Open-Meteo (datos horarios y diarios)</p>
    </section>
  );
}
