'use client';

import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { dewPoint } from '@/lib/dewPoint';

ChartJS.register(ArcElement, Tooltip);

const COLORS = {
  temp: { grad: ['#f97316', '#fbbf24', '#22d3ee', '#3b82f6'], bg: 'rgba(251,191,36,0.12)' },
  hum: { grad: ['#0ea5e9', '#38bdf8', '#7dd3fc'], bg: 'rgba(14,165,233,0.12)' },
  wind: { grad: ['#10b981', '#34d399', '#6ee7b7'], bg: 'rgba(16,185,129,0.12)' },
  pressure: { grad: ['#8b5cf6', '#a78bfa', '#c4b5fd'], bg: 'rgba(139,92,246,0.12)' },
};

function Gauge({ value, label, unit, min, max, color, decimals = 1 }: { value: number | null; label: string; unit: string; min: number; max: number; color: typeof COLORS.temp; decimals?: number }) {
  const safeValue = value ?? 0;
  const pct = Math.max(0, Math.min(100, ((safeValue - min) / (max - min)) * 100));
  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="relative mt-1 h-20 w-20 sm:h-24 sm:w-24">
        <Doughnut
          data={{
            datasets: [{
              data: [pct, 100 - pct],
              backgroundColor: [color.grad[0], color.bg],
              borderWidth: 0,
            }],
          }}
          options={{ responsive: true, maintainAspectRatio: true, cutout: '75%', plugins: { tooltip: { enabled: false } } }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-slate-950 sm:text-xl">{value !== null ? safeValue.toFixed(decimals) : '—'}</span>
          <span className="text-[9px] font-bold text-slate-500">{unit}</span>
        </div>
      </div>
    </div>
  );
}

export default function CurrentGauges({ data }: { data: any }) {
  if (!data?.current) return null;
  const c = data.current;
  const h = c.humidityPct ?? null;
  const dew = c.temperatureC != null && h != null
    ? dewPoint(c.temperatureC, h) : null;
  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Ahora</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Condiciones actuales</h2>
          <p className="mt-1 text-sm text-slate-600">Datos fusionados en tiempo real.</p>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
        <Gauge value={c.temperatureC ?? null} label="Temperatura" unit="°C" min={-10} max={45} color={COLORS.temp} />
        <Gauge value={h} label="Humedad" unit="%" min={0} max={100} color={COLORS.hum} decimals={0} />
        <Gauge value={c.windSpeedKmh ?? null} label="Viento" unit="km/h" min={0} max={80} color={COLORS.wind} />
        <Gauge value={dew} label="Punto de rocío" unit="°C" min={-15} max={30} color={COLORS.pressure} />
      </div>
      <p className="mt-4 text-[10px] text-slate-400">Fuente: /api/weather/current &mdash; Open-Meteo + AEMET</p>
    </section>
  );
}
