'use client';

import { useState, type ReactNode } from 'react';
import { useWeatherData } from '@/hooks/useWeatherData';
import {
  weatherEmoji,
  weatherCodeDescription,
  windDirection,
  temperatureColor,
  dayLabel,
  frostRiskLabel,
} from '@/lib/display';
import type {
  SourceHealth,
  WeatherAlert,
  LightningData,
  AgriculturalData,
  LivestockData,
  HourlyWeather,
  DailyWeather,
  NowcastData,
  RadarData,
} from '@/types/weather';
import WeatherStationPanel from '@/components/WeatherStationPanel';
import RadarPanel from '@/components/RadarPanel';
import NowcastPanel from '@/components/NowcastPanel';
import ModelTransparencyPanel from '@/components/ModelTransparencyPanel';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface Props {
  variant?: 'neutral' | 'ayto';
  isAdmin?: boolean;
}

type DashboardTab = 'forecast' | 'operations' | 'technical';

const dashboardTabLabels: Record<DashboardTab, string> = {
  forecast: 'Pronostico',
  operations: 'Operativa',
  technical: 'Tecnico',
};

function cn(neutral: string, ayto: string, variant: 'neutral' | 'ayto') {
  return variant === 'ayto' ? ayto : neutral;
}

function SourceDot({ status }: { status: string }) {
  const color =
    status === 'OK' ? 'bg-emerald-500' : status === 'DEGRADED' ? 'bg-amber-500' : 'bg-rose-500';
  const title =
    status === 'OK' ? 'Datos en tiempo real' : status === 'DEGRADED' ? 'Datos degradados o antiguos' : 'Fuente no disponible';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} title={title} />;
}

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    aviso: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    peligro: 'bg-orange-100 text-orange-800 border-orange-300',
    severo: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors[level] ?? 'bg-slate-100 text-slate-700'}`}>
      {level}
    </span>
  );
}

function OverviewMetric({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string;
  caption: string;
  tone?: 'default' | 'accent' | 'warning';
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-sky-50 text-sky-900 border-sky-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-900 border-amber-100'
        : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className={`rounded-[22px] border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
    </div>
  );
}

function SourceHealthRow({ health }: { health: SourceHealth[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {health.map((source) => {
        const statusLabel = source.status === 'OK' ? 'en vivo' : source.status === 'DEGRADED' ? 'degradado' : 'caido';
        const ageStr = source.dataAgeMinutes !== undefined ? `${Math.round(source.dataAgeMinutes)} min` : 'sin edad';
        const name = source.source === 'LOCAL_STATIONS' ? 'Miniestaciones' : source.source === 'OPEN_METEO' ? 'Open-Meteo' : 'AEMET';
        return (
          <div key={source.source} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
            <SourceDot status={source.status} />
            <span className="font-semibold text-slate-700">{name}</span>
            <span>{ageStr}</span>
            <span className="text-[11px]">{statusLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

function AlertDropdown({ alerts, variant }: { alerts: WeatherAlert[]; variant: 'neutral' | 'ayto' }) {
  const [open, setOpen] = useState(false);
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 rounded-full border ${border} bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50`}
      >
        <span>Alertas</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${alerts.length > 0 ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {alerts.length}
        </span>
      </button>
      {open && (
        <div className={`absolute right-0 top-full z-10 mt-2 w-80 rounded-[22px] border ${border} bg-white p-3 shadow-2xl`}>
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-500">No hay alertas activas.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <div key={`${alert.title}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <SeverityBadge level={alert.level} />
                    <p className="text-sm font-semibold text-slate-800">{alert.title}</p>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-slate-600">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LightningPanel({ lightning }: { lightning: LightningData }) {
  const levelColors: Record<string, string> = {
    info: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    precaucion: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    alerta: 'text-orange-700 bg-orange-50 border-orange-200',
    peligro: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className={`rounded-[22px] border p-4 ${levelColors[lightning.level] ?? 'bg-slate-50'}`}>
      <h3 className="text-base font-bold">Actividad electrica</h3>
      <p className="mt-2 text-sm">{lightning.message}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-xs uppercase tracking-[0.18em]">Rayos detectados</p>
          <p className="mt-1 text-xl font-bold">{lightning.strikeCount}</p>
        </div>
        {lightning.nearestStrikeKm !== null && (
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-xs uppercase tracking-[0.18em]">Rayo mas cercano</p>
            <p className="mt-1 text-xl font-bold">{lightning.nearestStrikeKm.toFixed(1)} km</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgriculturalSection({ agri, variant }: { agri: AgriculturalData; variant: 'neutral' | 'ayto' }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const pestRiskColors = {
    bajo: 'text-green-700 bg-green-50',
    medio: 'text-amber-700 bg-amber-50',
    alto: 'text-red-700 bg-red-50',
  };

  return (
    <div className={`rounded-[24px] border ${border} bg-white p-5 shadow-sm`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa operativa</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Asesoria agricola</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agri.workability.workable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {agri.workability.workable ? 'Suelo operable' : 'Labores no recomendadas'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewMetric label="ET0" value={`${agri.et0CumulativeMm.toFixed(1)} mm`} caption="Evapotranspiracion acumulada" />
        <OverviewMetric label="GDD" value={`${agri.gddCumulative.toFixed(0)}`} caption="Grados dia estimados" />
        <OverviewMetric label="Frio" value={`${agri.chillHours.toFixed(0)} h`} caption="Horas frio semanales" />
        <OverviewMetric
          label="Helada 48h"
          value={frostRiskLabel(agri.frostRisk48h)}
          caption="Riesgo microclimatico local"
          tone={agri.frostRisk48h === 'alta' || agri.frostRisk48h === 'muy_alta' ? 'warning' : 'default'}
        />
      </div>

      {(agri.recommendedIrrigationLitersM2 !== undefined || agri.pestRisk) && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {agri.recommendedIrrigationLitersM2 !== undefined && (
            <div className="rounded-[20px] border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Riego recomendado</p>
              <p className="mt-2 text-2xl font-bold text-sky-900">{agri.recommendedIrrigationLitersM2.toFixed(1)} l/m²</p>
              <p className="mt-1 text-sm text-sky-800">Balance semanal para cultivos de la zona.</p>
            </div>
          )}
          {agri.pestRisk && (
            <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Plagas comarcales</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Repilo</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pestRiskColors[agri.pestRisk.repiloRisk]}`}>
                  {agri.pestRisk.repiloRisk}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Mosca del olivo</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pestRiskColors[agri.pestRisk.oliveFlyRisk]}`}>
                  {agri.pestRisk.oliveFlyRisk}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {agri.workability.reasons.length > 0 && (
        <div className="mt-4 rounded-[20px] border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Motivos operativos</p>
          <ul className="mt-2 space-y-1">
            {agri.workability.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LivestockSection({ livestock, variant }: { livestock: LivestockData; variant: 'neutral' | 'ayto' }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const levelColors: Record<string, string> = {
    ninguno: 'bg-emerald-50 text-emerald-700',
    leve: 'bg-yellow-50 text-yellow-700',
    moderado: 'bg-orange-50 text-orange-700',
    severo: 'bg-red-50 text-red-700',
    peligroso: 'bg-red-100 text-red-800',
  };

  return (
    <div className={`rounded-[24px] border ${border} bg-white p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa operativa</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Estres termico ganadero</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelColors[livestock.level] ?? 'bg-slate-100 text-slate-700'}`}>
          {livestock.level}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <OverviewMetric label="Indice ITH" value={livestock.thi.toFixed(1)} caption="Valor sintetico actual" />
        <OverviewMetric label="Impacto" value={livestock.affectedLivestock} caption="Perfil mas afectado" />
      </div>
    </div>
  );
}

function getUpcomingHourlyRows(hourly: HourlyWeather, hours = 24) {
  const rows: { time: string; temp: number; hum: number; precip: number; wind: number; wcode: number }[] = [];
  const now = new Date();

  for (let index = 0; index < hourly.time.length; index++) {
    const time = new Date(hourly.time[index]);
    if (time >= now) {
      rows.push({
        time: hourly.time[index],
        temp: hourly.temperatureC[index],
        hum: hourly.humidityPct[index],
        precip: hourly.precipitationMm[index],
        wind: hourly.windSpeedKmh[index],
        wcode: hourly.weatherCode[index],
      });
    }
  }

  return rows.slice(0, hours);
}

function HourlyTable({ hourly, variant, compact }: { hourly: HourlyWeather; variant: 'neutral' | 'ayto'; compact?: boolean }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);
  const display = getUpcomingHourlyRows(hourly, 24);

  return (
    <div className={`${compact ? '' : `overflow-hidden rounded-[24px] border ${border} bg-white`}`}>
      {!compact && (
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Pronostico horario</p>
          <p className="text-xs text-slate-500">Proximas 24 horas desglosadas por temperatura, humedad, precipitacion y viento.</p>
        </div>
      )}
      <div className="space-y-2 sm:hidden">
        {display.map((row, index) => (
          <div key={`${row.time}-mobile-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {new Date(row.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-1 text-xs text-slate-500">{weatherCodeDescription(row.wcode)}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl">{weatherEmoji(row.wcode)}</p>
                <p className="text-lg font-bold" style={{ color: temperatureColor(row.temp) }}>
                  {row.temp.toFixed(1)}°C
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
              <span>HR {row.hum.toFixed(0)}%</span>
              <span>{row.precip.toFixed(1)} mm</span>
              <span>{row.wind.toFixed(0)} km/h</span>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left">Hora</th>
              <th className="px-3 py-2 text-right">Temp</th>
              <th className="px-3 py-2 text-right">HR</th>
              <th className="px-3 py-2 text-right">Precip</th>
              <th className="px-3 py-2 text-right">Viento</th>
              <th className="px-3 py-2 text-center">Cielo</th>
            </tr>
          </thead>
          <tbody>
            {display.map((row, index) => (
              <tr key={`${row.time}-${index}`} className="border-t border-slate-100">
                <td className="px-3 py-2">{new Date(row.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</td>
                <td className="px-3 py-2 text-right font-semibold" style={{ color: temperatureColor(row.temp) }}>
                  {row.temp.toFixed(1)}°C
                </td>
                <td className="px-3 py-2 text-right">{row.hum.toFixed(0)}%</td>
                <td className="px-3 py-2 text-right">{row.precip.toFixed(1)} mm</td>
                <td className="px-3 py-2 text-right">{row.wind.toFixed(0)} km/h</td>
                <td className="px-3 py-2 text-center">{weatherEmoji(row.wcode)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {display.length === 0 && (
        <p className="px-3 py-4 text-sm text-slate-500">No hay horas futuras disponibles en la fuente actual.</p>
      )}
    </div>
  );
}

function HourlyForecastDetails({ hourly, variant }: { hourly: HourlyWeather; variant: 'neutral' | 'ayto' }) {
  const [open, setOpen] = useState(false);
  const rows = getUpcomingHourlyRows(hourly, 24);
  const totalRain = rows.reduce((sum, row) => sum + row.precip, 0);
  const maxWind = rows.length > 0 ? Math.max(...rows.map((row) => row.wind)) : 0;
  const maxTemp = rows.length > 0 ? Math.max(...rows.map((row) => row.temp)) : 0;

  return (
    <details
      className="dashboard-detail rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer" aria-expanded={open}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximas horas</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">Pronostico horario</h3>
            <p className="mt-1 text-sm text-slate-500">
              24h · max {maxTemp.toFixed(0)}°C · lluvia {totalRain.toFixed(1)} mm · viento max {maxWind.toFixed(0)} km/h
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {open ? 'Ocultar' : 'Desplegar'}
          </span>
        </div>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <HourlyTable hourly={hourly} variant={variant} compact />
      </div>
    </details>
  );
}

function DailyCards({ daily, variant }: { daily: DailyWeather; variant: 'neutral' | 'ayto' }) {
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximos dias</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Proximos 5 dias</h3>
        </div>
        <p className="text-sm text-slate-500">Resumen diario para planificar con rapidez.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        {daily.time.slice(0, 5).map((time, index) => (
          <div key={time} className={`rounded-[22px] border ${border} bg-white p-4 text-center shadow-sm`}>
            <p className="text-sm font-semibold text-slate-700">{dayLabel(time)}</p>
            <p className="mt-2 text-3xl">{weatherEmoji(daily.weatherCode[index])}</p>
            <p className="mt-1 text-xs text-slate-500">{weatherCodeDescription(daily.weatherCode[index])}</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <span className="font-bold text-red-500">{daily.temperatureMaxC[index].toFixed(0)}°</span>
              <span className="font-bold text-blue-500">{daily.temperatureMinC[index].toFixed(0)}°</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{daily.precipitationSumMm[index].toFixed(1)} mm</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemperatureChart({ hourly, daily, variant }: { hourly: HourlyWeather; daily: DailyWeather; variant: 'neutral' | 'ayto' }) {
  const lineColor = variant === 'ayto' ? '#1B3668' : '#1c426c';
  const fillColor = variant === 'ayto' ? 'rgba(27,54,104,0.12)' : 'rgba(28,66,108,0.12)';

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
        borderColor: lineColor,
        backgroundColor: fillColor,
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

function CompactRainCard({ nowcast, radar }: { nowcast?: NowcastData; radar?: RadarData }) {
  if (nowcast && nowcast.minutesToRain !== null) {
    return <OverviewMetric label="Lluvia" value={`${nowcast.minutesToRain} min`} caption="Inicio estimado de precipitacion" tone="warning" />;
  }

  if (radar && radar.level !== 'ninguno') {
    return <OverviewMetric label="Radar" value={radar.level} caption="Actividad regional detectada" tone="warning" />;
  }

  return <OverviewMetric label="Lluvia" value="Sin aviso" caption="Sin señal inmediata en radar/nowcast" tone="accent" />;
}

function TabButton({
  tab,
  activeTab,
  onClick,
}: {
  tab: DashboardTab;
  activeTab: DashboardTab;
  onClick: (tab: DashboardTab) => void;
}) {
  const active = activeTab === tab;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`dashboard-panel-${tab}`}
      id={`dashboard-tab-${tab}`}
      className="dashboard-tab"
      data-active={String(active)}
      onClick={() => onClick(tab)}
    >
      {dashboardTabLabels[tab]}
    </button>
  );
}

function DashboardDetail({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className="dashboard-detail rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer" aria-expanded={open}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{eyebrow}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
            {open ? 'Ocultar' : 'Desplegar'}
          </span>
        </div>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
    </details>
  );
}

export default function WeatherDashboard({ variant = 'neutral' }: Props) {
  const { data, error, loading } = useWeatherData('meteo-dashboard');
  const [activeTab, setActiveTab] = useState<DashboardTab>('forecast');
  const border = cn('border-slate-200', 'border-[#e8e4d8]', variant);

  if (loading) {
    return (
      <div className="surface-card flex items-center justify-center rounded-[28px] p-20">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card rounded-[28px] p-20 text-center">
        <p className="font-semibold text-red-500">Error al cargar datos</p>
        <p className="mt-2 text-sm text-slate-500">{error.message}</p>
      </div>
    );
  }

  if (!data) return null;

  const todayRainProbability = data.daily.precipitationProbabilityPct[0];
  const alertSummary = data.alerts.length > 0 ? `${data.alerts.length} activas` : 'Sin alertas';
  const confidenceTone = data.confidencePct >= 70 ? 'accent' : data.confidencePct >= 50 ? 'default' : 'warning';

  return (
    <div className={`surface-card-strong overflow-hidden rounded-[32px] border ${border} p-4 sm:p-6`}>
      <div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(17,37,63,0.98),rgba(28,66,108,0.95),rgba(45,127,249,0.88))] px-5 py-6 text-white sm:px-7 sm:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className="eyebrow border-white/10 bg-white/10 text-sky-100">Resumen local</span>
            <h2 className="mt-5 text-3xl font-bold sm:text-4xl">{data.location}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-100/88">
              Estado actual, proximas horas y avisos relevantes para decidir rapido sin entrar en detalle tecnico.
            </p>
            <div className="mt-5 flex flex-wrap items-end gap-4">
              <div className="flex items-center gap-4">
                <span className="text-6xl">{weatherEmoji(data.current.weatherCode)}</span>
                <div>
                  <p className="text-5xl font-bold" style={{ color: temperatureColor(data.current.temperatureC) }}>
                    {data.current.temperatureC.toFixed(1)}°C
                  </p>
                  <p className="mt-1 text-sm text-slate-100/78">
                    Sensacion {data.current.apparentTemperatureC.toFixed(1)}°C · {weatherCodeDescription(data.current.weatherCode)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-6">
              <SourceHealthRow health={data.sourceHealth} />
            </div>
          </div>
          <div className="flex flex-col items-start gap-3">
            <AlertDropdown alerts={data.alerts} variant={variant} />
            <div className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-slate-50">
              Actualizado {new Date(data.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-4">
          <OverviewMetric label="Humedad" value={`${data.current.humidityPct.toFixed(0)}%`} caption="Ambiente actual" />
          <OverviewMetric
            label="Viento"
            value={`${data.current.windSpeedKmh.toFixed(0)} km/h`}
            caption={windDirection(data.current.windDirectionDeg)}
          />
          <CompactRainCard nowcast={data.nowcast} radar={data.radar} />
          <OverviewMetric
            label="Confianza"
            value={`${data.confidencePct.toFixed(0)}%`}
            caption={alertSummary}
            tone={confidenceTone}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="metric-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Lectura operativa</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Lo que importa ahora</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Precipitacion hoy</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{data.current.precipitationMm.toFixed(1)} mm</p>
              <p className="mt-1 text-sm text-slate-600">Acumulado actual</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Prob. lluvia</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{todayRainProbability.toFixed(0)}%</p>
              <p className="mt-1 text-sm text-slate-600">Prevision diaria base</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Rafagas</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{data.current.windGustKmh.toFixed(0)} km/h</p>
              <p className="mt-1 text-sm text-slate-600">Pico actual estimado</p>
            </div>
          </div>
        </div>

        <div className="metric-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Modelo meteorologico</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Confianza del dato</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Fusion activa</p>
              <p className="mt-1">Dato principal consolidado desde fuentes publicas y red local.</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Detalle bajo demanda</p>
              <p className="mt-1">Radar y transparencia quedan en la pestaña tecnica para no saturar la lectura principal.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 rounded-full bg-slate-100 p-2" role="tablist" aria-label="Secciones del panel meteorologico">
        <TabButton tab="forecast" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton tab="operations" activeTab={activeTab} onClick={setActiveTab} />
        <TabButton tab="technical" activeTab={activeTab} onClick={setActiveTab} />
      </div>

      <div className="mt-6">
        {activeTab === 'forecast' && (
          <div
            className="space-y-5"
            role="tabpanel"
            id="dashboard-panel-forecast"
            aria-labelledby="dashboard-tab-forecast"
          >
            {data.nowcast && (data.nowcast.level !== 'ninguno' || data.nowcast.stormDetected) && (
              <NowcastPanel nowcast={data.nowcast} variant={variant} />
            )}
            <div className={`rounded-[28px] border ${border} bg-white p-4 shadow-sm sm:p-5`}>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximas horas</p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">Temperatura prevista</h3>
                </div>
                <p className="text-sm text-slate-500">Evolucion inmediata y referencia diaria.</p>
              </div>
              <TemperatureChart hourly={data.hourly} daily={data.daily} variant={variant} />
            </div>
            <DailyCards daily={data.daily} variant={variant} />
            <HourlyForecastDetails hourly={data.hourly} variant={variant} />
          </div>
        )}

        {activeTab === 'operations' && (
          <div
            className="space-y-5"
            role="tabpanel"
            id="dashboard-panel-operations"
            aria-labelledby="dashboard-tab-operations"
          >
            <WeatherStationPanel variant={variant} />
            {data.agricultural && <AgriculturalSection agri={data.agricultural} variant={variant} />}
            {data.livestock && <LivestockSection livestock={data.livestock} variant={variant} />}
            {data.lightning && data.lightning.active && <LightningPanel lightning={data.lightning} />}
          </div>
        )}

        {activeTab === 'technical' && (
          <div
            className="space-y-4"
            role="tabpanel"
            id="dashboard-panel-technical"
            aria-labelledby="dashboard-tab-technical"
          >
            <DashboardDetail eyebrow="Detalle tecnico" title="Transparencia del modelo">
              <ModelTransparencyPanel data={data} variant={variant} />
            </DashboardDetail>

            <DashboardDetail eyebrow="Detalle tecnico" title="Radar regional">
              <RadarPanel radar={data.radar} variant={variant} />
            </DashboardDetail>
          </div>
        )}
      </div>
    </div>
  );
}
