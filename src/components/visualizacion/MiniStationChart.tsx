'use client';

import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useApiData } from '@/hooks/useApiData';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler } from 'chart.js';
import { useMemo } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

function ChartBox({ height, children }: { height: number; children: React.ReactNode }) {
  return <div className="relative overflow-hidden" style={{ height }}>{children}</div>;
}

function fmtHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayHour(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit' }) + 'h';
}

export default function MiniStationChart() {
  const { data: climate } = useClimateCalibration();
  const station = climate?.nodes?.localStation;
  const { data: historyData } = useApiData<{ readings: any[] }>('/api/weather/stations/history', 'station-history');
  const readings = historyData?.readings ?? [];

  const hasStation = station?.status === 'OK';
  const hasHistory = readings.length >= 2;

  const labels = useMemo(() => readings.map((r: any) => fmtDayHour(r.measured_at)), [readings]);
  const temps = useMemo(() => readings.map((r: any) => r.temperature), [readings]);
  const hums = useMemo(() => readings.map((r: any) => r.humidity), [readings]);
  const pressures = useMemo(() => readings.map((r: any) => r.pressure), [readings]);
  const hasPressure = pressures.some((p: any) => p != null);

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Mini estación</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">Datos del sensor local</h2>
          <p className="mt-1 text-sm text-slate-600">
            {hasStation
              ? `Estación ${station.name} · ${station.stationId}`
              : 'Estación local no disponible en este momento'}
          </p>
        </div>
      </div>

      {hasStation && (
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">Temperatura</p>
            <p className="mt-1 text-3xl font-black text-orange-900">{station.temperatureC?.toFixed(1) ?? '—'}°C</p>
            <p className="mt-0.5 text-[11px] text-orange-600">{station.time ? fmtHour(station.time) : '—'}</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">Humedad</p>
            <p className="mt-1 text-3xl font-black text-sky-900">{station.humidityPct?.toFixed(0) ?? '—'}%</p>
            <p className="mt-0.5 text-[11px] text-sky-600">HR</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-purple-700">Presión</p>
            <p className="mt-1 text-3xl font-black text-purple-900">{station.pressureHPa?.toFixed(0) ?? '—'}</p>
            <p className="mt-0.5 text-[11px] text-purple-600">hPa</p>
          </div>
        </div>
      )}

      {hasHistory && (
        <div className="mt-6 space-y-6">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Temperatura — últimas {readings.length} lecturas</p>
            <ChartBox height={200}>
              <Line
                data={{
                  labels,
                  datasets: [{
                    label: 'Temperatura',
                    data: temps,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249,115,22,0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 6,
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
                    x: { ticks: { maxTicksLimit: 8, font: { size: 9 } }, grid: { display: false } },
                    y: { ticks: { font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                  },
                }}
              />
            </ChartBox>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Humedad relativa (%)</p>
              <ChartBox height={180}>
                <Line
                  data={{
                    labels,
                    datasets: [{
                      label: 'HR',
                      data: hums,
                      borderColor: '#0ea5e9',
                      backgroundColor: 'rgba(14,165,233,0.1)',
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
                      x: { ticks: { maxTicksLimit: 6, font: { size: 9 } }, grid: { display: false } },
                      y: { min: 0, max: 100, ticks: { font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                    },
                  }}
                />
              </ChartBox>
            </div>

            {hasPressure && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Presión atmosférica (hPa)</p>
                <ChartBox height={180}>
                  <Line
                    data={{
                      labels,
                      datasets: [{
                        label: 'Presión',
                        data: pressures,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139,92,246,0.1)',
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
                        x: { ticks: { maxTicksLimit: 6, font: { size: 9 } }, grid: { display: false } },
                        y: { ticks: { font: { size: 9 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
                      },
                    }}
                  />
                </ChartBox>
              </div>
            )}
          </div>
        </div>
      )}

      {!hasHistory && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-500">No hay lecturas históricas disponibles de la estación local.</p>
          <p className="mt-1 text-xs text-slate-400">Los datos aparecerán cuando la estación comience a transmitir.</p>
        </div>
      )}
    </section>
  );
}
