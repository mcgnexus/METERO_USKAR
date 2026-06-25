'use client';

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { HourlyWeather } from '@/types/weather';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function windStatus(speed: number): { label: string; color: string } {
  if (speed <= 10) return { label: 'Apto', color: '#16a34a' };
  if (speed <= 18) return { label: 'Precaución', color: '#f59e0b' };
  return { label: 'No recomendado', color: '#dc2626' };
}

function bestWindow(hours: { time: string; wind: number }[]): string {
  const good = hours.filter((h) => h.wind <= 10);
  if (good.length === 0) return 'No hay una ventana clara con viento bajo.';

  let bestStart = good[0];
  let bestEnd = good[0];
  let currentStart = good[0];
  let currentEnd = good[0];

  for (let i = 1; i < good.length; i += 1) {
    const prev = new Date(good[i - 1].time).getTime();
    const current = new Date(good[i].time).getTime();
    if (current - prev <= 90 * 60 * 1000) {
      currentEnd = good[i];
    } else {
      if (new Date(currentEnd.time).getTime() - new Date(currentStart.time).getTime() > new Date(bestEnd.time).getTime() - new Date(bestStart.time).getTime()) {
        bestStart = currentStart;
        bestEnd = currentEnd;
      }
      currentStart = good[i];
      currentEnd = good[i];
    }
  }

  if (new Date(currentEnd.time).getTime() - new Date(currentStart.time).getTime() > new Date(bestEnd.time).getTime() - new Date(bestStart.time).getTime()) {
    bestStart = currentStart;
    bestEnd = currentEnd;
  }

  return `Mejor ventana para tratar: de ${fmtHour(bestStart.time)} a ${fmtHour(bestEnd.time)}, si se mantiene el viento previsto.`;
}

export function WindTreatmentChart({ hourly }: { hourly?: HourlyWeather }) {
  const points = (hourly?.time ?? []).slice(0, 24).map((time, index) => ({
    time,
    wind: hourly?.windSpeedKmh[index] ?? 0,
  }));

  if (points.length === 0) return null;

  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Viento para tratamientos</p>
      <h2 className="mt-1 text-lg font-black text-slate-950">Cuándo conviene tratar</h2>
      <p className="mt-1 text-sm text-slate-700">Verde: apto · amarillo: precaución · rojo: no recomendado.</p>
      <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-900">{bestWindow(points)}</p>

      <div className="relative mt-4 h-64">
        <Bar
          data={{
            labels: points.map((p) => fmtHour(p.time)),
            datasets: [{
              label: 'Viento km/h',
              data: points.map((p) => p.wind),
              backgroundColor: points.map((p) => `${windStatus(p.wind).color}99`),
              borderColor: points.map((p) => windStatus(p.wind).color),
              borderWidth: 1,
              borderRadius: 6,
            }],
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  afterLabel: (ctx) => windStatus(Number(ctx.parsed.y)).label,
                },
              },
            },
            scales: {
              x: { ticks: { maxTicksLimit: 12, font: { size: 10 } }, grid: { display: false } },
              y: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
            },
          }}
        />
      </div>
    </section>
  );
}
