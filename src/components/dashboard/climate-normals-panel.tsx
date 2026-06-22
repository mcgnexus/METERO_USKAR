'use client';

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import type { ClimateNormalsPayload } from '@/services/climateNormalsService';

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function ClimateNormalsPanel() {
  const { data, loading, error } = useApiData<ClimateNormalsPayload>(
    '/api/weather/climate-normals',
    'climate-normals'
  );
  const [showAllMonths, setShowAllMonths] = useState(false);

  if (loading) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Climatologia</p>
        <p className="mt-2 text-sm text-slate-400">Datos no disponibles en este momento.</p>
      </div>
    );
  }

  const dev = data.currentMonthDeviation;
  const tempDevColor =
    dev.deviationC === null ? 'text-slate-500'
    : dev.deviationC > 0.5 ? 'text-orange-600'
    : dev.deviationC < -0.5 ? 'text-sky-600'
    : 'text-emerald-600';

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Climatologia</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">🌡️ Este mes vs lo normal</h3>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[22px] sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">Temp. observada</p>
          <p className="mt-1.5 text-xl font-bold sm:mt-2 sm:text-2xl">{dev.observedTempMeanC !== null ? `${dev.observedTempMeanC.toFixed(1)}°C` : '—'}</p>
          <p className="mt-0.5 text-xs text-slate-600 sm:mt-1 sm:text-sm">{MONTHS_ES[dev.month - 1]}</p>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[22px] sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">Temp. normal</p>
          <p className="mt-1.5 text-xl font-bold text-slate-600 sm:mt-2 sm:text-2xl">{dev.normalTempMeanC.toFixed(1)}°C</p>
          <p className="mt-0.5 text-xs text-slate-600 sm:mt-1 sm:text-sm">Media 1991-2020</p>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[22px] sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">Desviacion</p>
          <p className={`mt-1.5 text-xl font-bold sm:mt-2 sm:text-2xl ${tempDevColor}`}>
            {dev.deviationC !== null ? `${dev.deviationC > 0 ? '+' : ''}${dev.deviationC.toFixed(1)}°C` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 sm:mt-1 sm:text-sm">{dev.deviationC !== null ? (dev.deviationC > 0.5 ? 'Mas calido' : dev.deviationC < -0.5 ? 'Mas frio' : 'En lo normal') : ''}</p>
        </div>
        <div className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[22px] sm:p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[11px]">Lluvia mes</p>
          <p className="mt-1.5 text-xl font-bold sm:mt-2 sm:text-2xl">
            {dev.observedPrecipMm !== null ? `${dev.observedPrecipMm.toFixed(0)} mm` : '—'}
          </p>
          <p className="mt-0.5 text-xs text-slate-600 sm:mt-1 sm:text-sm">
            Normal: {dev.normalPrecipMm.toFixed(0)} mm
            {dev.precipDeviationPct !== null && (
              <span className={`ml-1 ${dev.precipDeviationPct < -20 ? 'text-orange-600' : dev.precipDeviationPct > 20 ? 'text-emerald-600' : ''}`}>
                ({dev.precipDeviationPct > 0 ? '+' : ''}{dev.precipDeviationPct}%)
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-slate-100 bg-slate-50 p-3">
        <p className="text-sm text-slate-700">{dev.interpretation}</p>
      </div>

      {showAllMonths && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Normales mensuales 1991-2020</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="px-2 py-1 text-left">Mes</th>
                  <th className="px-2 py-1 text-right">T. max</th>
                  <th className="px-2 py-1 text-right">T. min</th>
                  <th className="px-2 py-1 text-right">T. media</th>
                  <th className="px-2 py-1 text-right">Lluvia</th>
                </tr>
              </thead>
              <tbody>
                {data.normals.map((n) => {
                  const isCurrent = n.month === dev.month;
                  return (
                    <tr key={n.month} className={`border-t border-slate-100 ${isCurrent ? 'bg-sky-50 font-semibold' : ''}`}>
                      <td className="px-2 py-1">{MONTHS_ES[n.month - 1]}{isCurrent && ' ←'}</td>
                      <td className="px-2 py-1 text-right text-red-500">{n.tempMaxC.toFixed(1)}°</td>
                      <td className="px-2 py-1 text-right text-blue-500">{n.tempMinC.toFixed(1)}°</td>
                      <td className="px-2 py-1 text-right">{n.tempMeanC.toFixed(1)}°</td>
                      <td className="px-2 py-1 text-right">{n.precipitationMm.toFixed(0)} mm</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <p className="text-[11px] text-slate-400">Fuente: ERA5-Land via Open-Meteo Climate Average (1991-2020)</p>
        <button
          onClick={() => setShowAllMonths((v) => !v)}
          className="text-xs font-semibold text-sky-600 hover:underline"
        >
          {showAllMonths ? 'Ocultar tabla' : 'Ver 12 meses'}
        </button>
      </div>
    </div>
  );
}
