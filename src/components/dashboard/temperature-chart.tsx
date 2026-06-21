'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { dayLabel } from '@/lib/display';
import { getUpcomingHourlyRows } from '@/components/dashboard/forecast-tables';
import type { DailyWeather, HourlyWeather } from '@/types/weather';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export function TemperatureChart({ hourly, daily }: { hourly: HourlyWeather; daily: DailyWeather }) {
  const upcomingRows = getUpcomingHourlyRows(hourly, 18);
  const hourlyLabels = upcomingRows.map((row) => new Date(row.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  const hourlyTemps = upcomingRows.map((row) => row.temp);
  const dailyLabels = daily.time.slice(0, 5).map((day) => dayLabel(day));
  const dailyMax = daily.temperatureMaxC.slice(0, 5);
  const dailyMin = daily.temperatureMinC.slice(0, 5);

  const data = {
    labels: [...hourlyLabels, ...dailyLabels],
    datasets: [
      {
        label: 'Temperatura proximas horas',
        data: [...hourlyTemps, ...dailyMax.map(() => null)],
        borderColor: '#1c426c',
        backgroundColor: 'rgba(28,66,108,0.12)',
        fill: true,
        tension: 0.32,
        pointRadius: 2,
      },
      {
        label: 'Maxima prevista',
        data: [...hourlyTemps.map(() => null), ...dailyMax],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.12)',
        fill: false,
        tension: 0.32,
        pointRadius: 4,
      },
      {
        label: 'Minima prevista',
        data: [...hourlyTemps.map(() => null), ...dailyMin],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: false,
        tension: 0.32,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { boxWidth: 12, padding: 14, font: { size: 11 } },
      },
    },
    scales: {
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
      y: { ticks: { font: { size: 10 }, callback: (value: string | number) => `${value}°C` } },
    },
  };

  return (
    <div className="h-80 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
