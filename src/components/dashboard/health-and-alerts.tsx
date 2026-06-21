'use client';

import { useState } from 'react';
import { SourceDot, ageDisplay, cn, SeverityBadge, statusLabel } from '@/components/dashboard/atoms';
import type { SourceHealth, WeatherAlert } from '@/types/weather';

export function SourceHealthRow({ health }: { health: SourceHealth[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {health.map((source) => {
        const name = source.source === 'LOCAL_STATIONS' ? 'Miniestaciones' : source.source === 'OPEN_METEO' ? 'Open-Meteo' : 'AEMET';
        const badge = statusLabel(source);
        return (
          <div key={source.source} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5">
            <SourceDot status={source.status} />
            <span className="font-semibold text-slate-700">{name}</span>
            <span className="text-slate-400">{ageDisplay(source)}</span>
            <span className={`text-[11px] ${source.status === 'OK' ? 'text-emerald-600' : source.status === 'DEGRADED' ? 'text-amber-600' : 'text-rose-500'}`}>
              {badge}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function AlertDropdown({ alerts, variant }: { alerts: WeatherAlert[]; variant: 'neutral' | 'ayto' }) {
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
