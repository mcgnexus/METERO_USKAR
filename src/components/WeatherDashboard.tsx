'use client';

import { useWeatherData } from '@/hooks/useWeatherData';
import { weatherEmoji, weatherCodeDescription, windDirection, temperatureColor, dayLabel, frostRiskLabel } from '@/lib/display';
import { WeatherPayload, SourceHealth, WeatherAlert, LightningData, AgriculturalData, LivestockData, HourlyWeather, DailyWeather } from '@/types/weather';
import WeatherStationPanel from '@/components/WeatherStationPanel';
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
import { useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  variant?: 'neutral' | 'ayto';
}

function cn(neutral: string, ayto: string, variant: 'neutral' | 'ayto') {
  return variant === 'ayto' ? ayto : neutral;
}

function SourceDot({ status }: { status: string }) {
  const color =
    status === 'OK' ? 'bg-green-500' : status === 'DEGRADED' ? 'bg-amber-500' : 'bg-red-500';
  const title =
    status === 'OK' ? 'Datos en tiempo real' : status === 'DEGRADED' ? 'Datos degradados o antiguos' : 'Fuente no disponible';
  return <span className={`inline-block w-3 h-3 rounded-full ${color} shadow-sm`} title={title} />;
}

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    aviso: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    peligro: 'bg-orange-100 text-orange-800 border-orange-300',
    severo: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${colors[level] ?? 'bg-gray-100 text-gray-800'}`}>
      {level}
    </span>
  );
}

function LightningPanel({ lightning }: { lightning: LightningData }) {
  const levelColors: Record<string, string> = {
    info: 'text-green-700 bg-green-50 border-green-200',
    precaucion: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    alerta: 'text-orange-700 bg-orange-50 border-orange-200',
    peligro: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${levelColors[lightning.level] ?? 'bg-gray-50'}`}>
      <h3 className="font-semibold mb-2">⚡ Actividad eléctrica</h3>
      <p className="text-sm">{lightning.message}</p>
      {lightning.nearestStrikeKm !== null && (
        <p className="text-sm mt-1">Rayo más cercano: {lightning.nearestStrikeKm.toFixed(1)} km</p>
      )}
      <p className="text-sm">Rayos detectados: {lightning.strikeCount}</p>
    </div>
  );
}

function AgriculturalSection({ agri, variant }: { agri: AgriculturalData; variant: 'neutral' | 'ayto' }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  return (
    <div className={`rounded-xl border ${border} p-4`}>
      <h3 className="font-semibold mb-3">🌱 Datos Agrícolas</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-slate-500">ET0 acumulada</span>
          <p className="font-medium">{agri.et0CumulativeMm.toFixed(1)} mm</p>
        </div>
        <div>
          <span className="text-slate-500">GDD acumulados</span>
          <p className="font-medium">{agri.gddCumulative.toFixed(0)} °C·día</p>
        </div>
        <div>
          <span className="text-slate-500">Horas frío</span>
          <p className="font-medium">{agri.chillHours.toFixed(0)} h</p>
        </div>
        <div>
          <span className="text-slate-500">Riesgo helada (48h)</span>
          <p className={`font-medium ${agri.frostRisk48h === 'alta' || agri.frostRisk48h === 'muy_alta' ? 'text-red-600' : 'text-amber-600'}`}>
            {frostRiskLabel(agri.frostRisk48h)}
          </p>
        </div>
      </div>
      <div className="mt-2 text-sm">
        <span className="text-slate-500">Trabajabilidad</span>
        <p className={`font-medium ${agri.workability.workable ? 'text-green-600' : 'text-red-600'}`}>
          {agri.workability.workable ? 'Apta' : 'No apta'}
        </p>
        {agri.workability.reasons.length > 0 && (
          <ul className="list-disc list-inside text-xs text-slate-500 mt-1">
            {agri.workability.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function LivestockSection({ livestock, variant }: { livestock: LivestockData; variant: 'neutral' | 'ayto' }) {
  const levelColors: Record<string, string> = {
    ninguno: 'text-green-600',
    leve: 'text-yellow-600',
    moderado: 'text-orange-600',
    severo: 'text-red-600',
    peligroso: 'text-red-800',
  };
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  return (
    <div className={`rounded-xl border ${border} p-4`}>
      <h3 className="font-semibold mb-3">🐄 Estrés Térmico (ITH)</h3>
      <p className="text-2xl font-bold">{livestock.thi.toFixed(1)}</p>
      <p className={`font-medium ${levelColors[livestock.level] ?? ''}`}>
        {livestock.level.charAt(0).toUpperCase() + livestock.level.slice(1)}
      </p>
      <p className="text-sm text-slate-500 mt-1">{livestock.affectedLivestock}</p>
    </div>
  );
}

function HourlyTable({ hourly, variant }: { hourly: HourlyWeather; variant: 'neutral' | 'ayto' }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const headerBg = cn('bg-slate-100', 'bg-[#e8e4d8]/50', variant);
  const rows: { time: string; temp: number; hum: number; precip: number; wind: number; wcode: number }[] = [];
  const now = new Date();
  for (let i = 0; i < hourly.time.length; i++) {
    const t = new Date(hourly.time[i]);
    if (t <= now) {
      rows.push({
        time: hourly.time[i],
        temp: hourly.temperatureC[i],
        hum: hourly.humidityPct[i],
        precip: hourly.precipitationMm[i],
        wind: hourly.windSpeedKmh[i],
        wcode: hourly.weatherCode[i],
      });
    }
  }
  const display = rows.slice(-24);
  return (
    <div className={`rounded-xl border ${border} overflow-hidden`}>
      <div className={`${headerBg} px-4 py-2 font-semibold text-sm`}>Temperatura horaria (últimas 24h)</div>
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className={`sticky top-0 ${headerBg}`}>
            <tr>
              <th className="text-left px-3 py-2">Hora</th>
              <th className="text-right px-3 py-2">Temp</th>
              <th className="text-right px-3 py-2">Humedad</th>
              <th className="text-right px-3 py-2">Precip</th>
              <th className="text-right px-3 py-2">Viento</th>
              <th className="text-center px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {display.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-3 py-1.5">{new Date(r.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="text-right px-3 py-1.5 font-medium" style={{ color: temperatureColor(r.temp) }}>{r.temp.toFixed(1)}°C</td>
                <td className="text-right px-3 py-1.5">{r.hum.toFixed(0)}%</td>
                <td className="text-right px-3 py-1.5">{r.precip.toFixed(1)} mm</td>
                <td className="text-right px-3 py-1.5">{r.wind.toFixed(0)} km/h</td>
                <td className="text-center px-3 py-1.5">{weatherEmoji(r.wcode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailyCards({ daily, variant }: { daily: DailyWeather; variant: 'neutral' | 'ayto' }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const cardBg = cn('bg-white', 'bg-white', variant);
  return (
    <div>
      <h3 className="font-semibold mb-3">Pronóstico 7 días</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {daily.time.slice(0, 7).map((t, i) => (
          <div key={i} className={`rounded-xl border ${border} ${cardBg} p-3 text-center`}>
            <p className="text-sm font-medium">{dayLabel(t)}</p>
            <p className="text-2xl mt-1">{weatherEmoji(daily.weatherCode[i])}</p>
            <p className="text-xs text-slate-500">{weatherCodeDescription(daily.weatherCode[i])}</p>
            <div className="flex justify-center gap-2 mt-2 text-sm">
              <span className="font-semibold text-red-500">{daily.temperatureMaxC[i].toFixed(0)}°</span>
              <span className="font-semibold text-blue-500">{daily.temperatureMinC[i].toFixed(0)}°</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{daily.precipitationSumMm[i].toFixed(1)} mm</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemperatureChart({ hourly, daily, variant }: { hourly: HourlyWeather; daily: DailyWeather; variant: 'neutral' | 'ayto' }) {
  const isAyto = variant === 'ayto';
  const lineColor = isAyto ? '#1B3668' : '#334155';
  const fillColor = isAyto ? 'rgba(27,54,104,0.1)' : 'rgba(51,65,85,0.1)';

  const hourlyLabels = hourly.time.slice(-24).map(t => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  const hourlyTemps = hourly.temperatureC.slice(-24);
  const dailyLabels = daily.time.slice(0, 7).map(d => dayLabel(d));
  const dailyMax = daily.temperatureMaxC.slice(0, 7);
  const dailyMin = daily.temperatureMinC.slice(0, 7);

  const data = {
    labels: [...hourlyLabels, ...dailyLabels],
    datasets: [
      {
        label: 'Temperatura horaria',
        data: [...hourlyTemps, ...dailyMax.map(() => null)],
        borderColor: lineColor,
        backgroundColor: fillColor,
        fill: true,
        tension: 0.3,
        pointRadius: 2,
        spanGaps: false,
      },
      {
        label: 'Máx. diaria',
        data: [...hourlyTemps.map(() => null), ...dailyMax],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
      },
      {
        label: 'Mín. diaria',
        data: [...hourlyTemps.map(() => null), ...dailyMin],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: false,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 }, callback: (v: string | number) => `${v}°C` } },
    },
  };

  return (
    <div className="w-full h-72">
      <Line data={data} options={options} />
    </div>
  );
}

function AlertDropdown({ alerts, variant }: { alerts: WeatherAlert[]; variant: 'neutral' | 'ayto' }) {
  const [open, setOpen] = useState(false);
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const bg = cn('bg-white', 'bg-white', variant);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${border} ${bg} text-sm font-medium hover:bg-slate-50 transition-colors`}
      >
        <span>Alertas</span>
        {alerts.length > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">{alerts.length}</span>
        )}
        <span className="ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className={`absolute top-full mt-2 right-0 w-80 rounded-xl border ${border} ${bg} shadow-lg z-10 max-h-80 overflow-y-auto`}>
          {alerts.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">No hay alertas activas</p>
          ) : (
            alerts.map((a, i) => (
              <div key={i} className="p-3 border-b border-slate-100 last:border-b-0">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityBadge level={a.level} />
                  <span className="font-medium text-sm">{a.title}</span>
                </div>
                <p className="text-xs text-slate-600">{a.message}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function LegendBadge({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function SourceHealthRow({ health }: { health: SourceHealth[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {health.map((h, i) => {
        const statusLabel = h.status === 'OK' ? 'en vivo' : h.status === 'DEGRADED' ? 'degradado' : 'caído';
        const ageStr = h.dataAgeMinutes !== undefined ? `${Math.round(h.dataAgeMinutes)} min` : '—';
        return (
          <div key={i} className="flex items-center gap-1.5" title={h.message}>
            <SourceDot status={h.status} />
            <span className="font-medium">{h.source === 'AEMET' ? 'AEMET' : 'Open-Meteo'}</span>
            <span className="text-slate-400">({ageStr})</span>
            <span className={`text-[10px] ${
              h.status === 'OK' ? 'text-green-600' : h.status === 'DEGRADED' ? 'text-amber-600' : 'text-red-500'
            }`}>{statusLabel}</span>
          </div>
        );
      })}
      <span className="text-[10px] text-slate-300 mx-1">|</span>
      <LegendBadge color="bg-green-500" label="en vivo" />
      <LegendBadge color="bg-amber-500" label="degradado" />
      <LegendBadge color="bg-red-500" label="caído" />
    </div>
  );
}

export default function WeatherDashboard({ variant = 'neutral' }: Props) {
  const { data, error, loading } = useWeatherData('meteo-dashboard');
  const isAyto = variant === 'ayto';
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const cardBg = cn('bg-white', 'bg-white', variant);
  const primary = cn('text-slate-800', 'text-[#1B3668]', variant);
  const primaryBg = cn('bg-slate-800', 'bg-[#1B3668]', variant);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20">
        <p className="text-red-500 font-medium mb-2">Error al cargar datos</p>
        <p className="text-sm text-slate-500">{error.message}</p>
      </div>
    );
  }

  if (!data) return null;

  const confidenceColor = data.confidencePct > 70 ? 'text-green-600' : data.confidencePct > 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className={`space-y-6 ${isAyto ? 'font-sans' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold ${primary}`}>{data.location}</h2>
          <div className="flex items-center gap-3 mt-1">
            <SourceHealthRow health={data.sourceHealth} />
            <span className={`text-sm font-semibold ${confidenceColor}`}>
              {data.confidencePct.toFixed(0)}% confianza
            </span>
          </div>
        </div>
        <AlertDropdown alerts={data.alerts} variant={variant} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-2 rounded-xl border ${border} ${cardBg} p-6`}>
          <div className="flex items-start gap-4">
            <span className="text-6xl">{weatherEmoji(data.current.weatherCode)}</span>
            <div>
              <p className="text-5xl font-bold" style={{ color: temperatureColor(data.current.temperatureC) }}>
                {data.current.temperatureC.toFixed(1)}°C
              </p>
              <p className="text-sm text-slate-500 mt-1">{weatherCodeDescription(data.current.weatherCode)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="text-xs text-slate-500">Sensación térmica</p>
              <p className="font-semibold">{data.current.apparentTemperatureC.toFixed(1)}°C</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Humedad</p>
              <p className="font-semibold">{data.current.humidityPct.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Precipitación</p>
              <p className="font-semibold">{data.current.precipitationMm.toFixed(1)} mm</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Radiación solar</p>
              <p className="font-semibold">{data.current.solarRadiationWm2.toFixed(0)} W/m²</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Viento</p>
              <p className="font-semibold">{data.current.windSpeedKmh.toFixed(0)} km/h {windDirection(data.current.windDirectionDeg)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Ráfagas</p>
              <p className="font-semibold">{data.current.windGustKmh.toFixed(0)} km/h</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">ET0</p>
              <p className="font-semibold">{data.current.et0Mm.toFixed(2)} mm</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {data.agricultural && <AgriculturalSection agri={data.agricultural} variant={variant} />}
          {data.livestock && <LivestockSection livestock={data.livestock} variant={variant} />}
          {data.lightning && data.lightning.active && <LightningPanel lightning={data.lightning} />}
          <WeatherStationPanel variant={variant} />
        </div>
      </div>

      <div className={`rounded-xl border ${border} ${cardBg} p-4`}>
        <TemperatureChart hourly={data.hourly} daily={data.daily} variant={variant} />
      </div>

      <div>
        <DailyCards daily={data.daily} variant={variant} />
      </div>

      <div>
        <HourlyTable hourly={data.hourly} variant={variant} />
      </div>

      <div className="text-xs text-slate-400 text-right">
        Actualizado: {new Date(data.fetchedAt).toLocaleString('es-ES')}
      </div>
    </div>
  );
}
