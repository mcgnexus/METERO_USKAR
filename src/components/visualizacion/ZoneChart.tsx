'use client';

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="relative overflow-hidden" style={{ height }}>{children}</div>;
}

const ZONE_COLORS: Record<string, string> = {
  URBAN: '#3b82f6',
  VEGA: '#10b981',
  SECANO: '#f59e0b',
  MONTE: '#8b5cf6',
  RESERVOIR: '#06b6d4',
};

export default function ZoneChart({ zones }: { zones: any[] }) {
  if (!zones?.length) return null;

  const names = zones.map((z: any) => z.name);
  const temps = zones.map((z: any) => z.temperatureC);
  const hums = zones.map((z: any) => z.humidityPct);
  const winds = zones.map((z: any) => z.windSpeedKmh);
  const colors = zones.map((z: any) => ZONE_COLORS[z.type] || '#94a3b8');

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Zonas</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Microclima por zona</h2>
          <p className="mt-1 text-sm text-slate-600">Comparativa térmica e hídrica de las pedanías y entornos de Huéscar.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Temperatura (°C)</p>
          <ChartBox height={224}>
          <Bar
            data={{
              labels: names,
              datasets: [{
                label: 'Temperatura',
                data: temps,
                backgroundColor: colors.map((c: string) => c + '88'),
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              resizeDelay: 0,
              indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { ticks: { font: { size: 9 } }, grid: { display: false } },
              },
            }}
          />
          </ChartBox>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Humedad relativa (%)</p>
          <ChartBox height={224}>
            <Bar
              data={{
                labels: names,
                datasets: [{
                  label: 'Humedad',
                  data: hums,
                  backgroundColor: colors.map((c: string) => c + '88'),
                  borderColor: colors,
                  borderWidth: 1,
                  borderRadius: 4,
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                resizeDelay: 0,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                  x: { min: 0, max: 100, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                  y: { ticks: { font: { size: 9 } }, grid: { display: false } },
                },
              }}
            />
          </ChartBox>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Viento (km/h)</p>
          <ChartBox height={224}>
          <Bar
            data={{
              labels: names,
              datasets: [{
                label: 'Viento',
                data: winds,
                backgroundColor: colors.map((c: string) => c + '88'),
                borderColor: colors,
                borderWidth: 1,
                borderRadius: 4,
              }],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              resizeDelay: 0,
              indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: {
                x: { beginAtZero: true, ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                y: { ticks: { font: { size: 9 } }, grid: { display: false } },
              },
            }}
          />
          </ChartBox>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {zones.map((z: any) => (
          <div key={z.name} className="rounded-2xl border border-slate-100 bg-white p-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: ZONE_COLORS[z.type] || '#94a3b8' }} />
              <span className="text-xs font-bold text-slate-700">{z.name}</span>
              <span className="ml-auto text-[9px] uppercase text-slate-400">{z.type}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center text-[11px]">
              <div><span className="font-black text-slate-900">{z.temperatureC?.toFixed(1)}°</span><span className="block text-slate-500">T</span></div>
              <div><span className="font-black text-sky-700">{z.humidityPct?.toFixed(0)}%</span><span className="block text-slate-500">HR</span></div>
              <div><span className="font-black text-emerald-700">{z.windSpeedKmh?.toFixed(0)}</span><span className="block text-slate-500">viento</span></div>
            </div>
            {z.frostRisk && z.frostRisk !== 'none' && (
              <p className="mt-1 text-center text-[9px] font-bold uppercase text-rose-600">Riesgo helada: {z.frostRisk === 'unknown' ? 'no disponible' : z.frostRisk === 'muy_alta' ? 'muy alta' : z.frostRisk}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/zones &mdash; Modelo de microclimas</p>
    </section>
  );
}
