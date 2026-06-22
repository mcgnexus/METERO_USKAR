'use client';

import { useState } from 'react';
import { dayLabel, temperatureColor, weatherCodeDescription, weatherEmoji } from '@/lib/display';
import type { DailyWeather, HourlyWeather } from '@/types/weather';

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function fmtNumber(value: number | undefined, digits = 0): string {
  return isNumber(value) ? value.toFixed(digits) : '—';
}

export function getUpcomingHourlyRows(hourly: HourlyWeather, hours = 24) {
  const rows: { time: string; temp: number; hum: number; precip: number; wind: number; wcode: number }[] = [];
  const now = new Date();

  for (let index = 0; index < hourly.time.length; index++) {
    const time = new Date(hourly.time[index]);
    const temp = hourly.temperatureC[index];
    const hum = hourly.humidityPct[index];
    const precip = hourly.precipitationMm[index];
    const wind = hourly.windSpeedKmh[index];
    const wcode = hourly.weatherCode[index];

    if (time >= now && isNumber(temp) && isNumber(hum) && isNumber(precip) && isNumber(wind) && isNumber(wcode)) {
      rows.push({
        time: hourly.time[index],
        temp,
        hum,
        precip,
        wind,
        wcode,
      });
    }
  }

  return rows.slice(0, hours);
}

export function HourlyTable({ hourly, compact }: { hourly: HourlyWeather; compact?: boolean }) {
  const display = getUpcomingHourlyRows(hourly, 24);

  return (
    <div className={compact ? '' : 'overflow-hidden rounded-[24px] border border-slate-200 bg-white'}>
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

export function HourlyForecastDetails({ hourly }: { hourly: HourlyWeather }) {
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
        <HourlyTable hourly={hourly} compact />
      </div>
    </details>
  );
}

export function DailyCards({ daily }: { daily: DailyWeather }) {
  const [expanded, setExpanded] = useState(false);
  const visibleCount = expanded ? 14 : 7;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximos dias</p>
          <h3 className="mt-1 text-xl font-bold text-slate-900">Proximos {visibleCount} dias</h3>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-sm text-slate-500 sm:block">Resumen diario para planificar con rapidez.</p>
          {daily.time.length > 7 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              {expanded ? 'Ver 7 dias' : 'Ver 14 dias'}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-5 lg:grid-cols-7">
        {daily.time.slice(0, Math.min(visibleCount, daily.time.length)).map((time, index) => {
          const weatherCode = daily.weatherCode[index];
          return (
          <div key={time} className="rounded-[18px] border border-slate-200 bg-white p-3 text-center shadow-sm sm:rounded-[22px] sm:p-4">
            <p className="text-xs font-semibold text-slate-700 sm:text-sm">{dayLabel(time)}</p>
            <p className="mt-1.5 text-2xl sm:mt-2 sm:text-3xl">{isNumber(weatherCode) ? weatherEmoji(weatherCode) : '—'}</p>
            <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">{isNumber(weatherCode) ? weatherCodeDescription(weatherCode) : 'Sin dato'}</p>
            <div className="mt-2 flex items-center justify-center gap-2 sm:mt-3 sm:gap-3">
              <span className="text-sm font-bold text-red-500 sm:text-base">{fmtNumber(daily.temperatureMaxC[index])}°</span>
              <span className="text-sm font-bold text-blue-500 sm:text-base">{fmtNumber(daily.temperatureMinC[index])}°</span>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400 sm:mt-2 sm:text-xs">{fmtNumber(daily.precipitationSumMm[index], 1)} mm</p>
          </div>
        );
        })}
      </div>
    </div>
  );
}
