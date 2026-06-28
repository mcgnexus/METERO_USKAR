'use client';

import { useState } from 'react';
import { fmtN } from '@/components/llano/atoms';
import type { LightningData, LightningStrike } from '@/types/weather';

const HUESCAR_LAT = 37.8;
const HUESCAR_LON = -2.5;
const MAP_SPAN_KM = 60;

function projectToSvg(lat: number, lon: number, size: number): [number, number] {
  const x = ((lon - (HUESCAR_LON - MAP_SPAN_KM / 111)) / (MAP_SPAN_KM / 111)) * size;
  const y = ((HUESCAR_LAT + MAP_SPAN_KM / 111) - lat) / (MAP_SPAN_KM / 111) * size;
  return [
    Math.max(4, Math.min(size - 4, x)),
    Math.max(4, Math.min(size - 4, y)),
  ];
}

function distanceColor(km: number): string {
  if (km < 5) return 'fill-rose-500';
  if (km < 15) return 'fill-amber-400';
  if (km < 30) return 'fill-yellow-300';
  return 'fill-sky-300';
}

function distanceLabel(km: number): string {
  if (km < 5) return 'text-rose-700 bg-rose-50 border-rose-200';
  if (km < 15) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (km < 30) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-sky-700 bg-sky-50 border-sky-200';
}

function StrikeMap({ strikes, size = 220 }: { strikes: LightningStrike[]; size?: number }) {
  if (strikes.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-slate-50 border border-slate-100" style={{ width: size, height: size }}>
        <p className="text-xs font-semibold text-slate-600">Sin rayos detectados</p>
      </div>
    );
  }

  const [cx, cy] = projectToSvg(HUESCAR_LAT, HUESCAR_LON, size);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        <circle cx={cx} cy={cy} r={size * 0.08} fill="none" stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3 2" />
        <circle cx={cx} cy={cy} r={size * 0.17} fill="none" stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="3 2" />
        <circle cx={cx} cy={cy} r={size * 0.33} fill="none" stroke="#cbd5e1" strokeWidth="0.5" strokeDasharray="4 3" />
        <circle cx={cx} cy={cy} r={size * 0.47} fill="none" stroke="#cbd5e1" strokeWidth="0.4" strokeDasharray="4 3" />
        <text x={cx} y={cy + 3} textAnchor="middle" className="fill-slate-500" fontSize="7" fontWeight="700">HUÉSCAR</text>
        {strikes.map((s, i) => {
          const [x, y] = projectToSvg(s.lat, s.lon, size);
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={s.distanceKm < 5 ? 4 : s.distanceKm < 15 ? 3 : 2} className={distanceColor(s.distanceKm)} opacity="0.85" />
              {s.distanceKm < 15 && (
                <circle cx={x} cy={y} r={8} fill="none" className={s.distanceKm < 5 ? 'stroke-rose-400' : 'stroke-amber-400'} strokeWidth="0.6" opacity="0.5" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SourceBadge({ source }: { source: LightningData['source'] }) {
  if (source === 'blitzortung') return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Blitzortung en vivo</span>;
  if (source === 'openmeteo_fallback') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Open-Meteo estimado</span>;
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">Sin datos</span>;
}

export function LightningPanel({ lightning }: { lightning?: LightningData | null }) {
  const [expanded, setExpanded] = useState(false);

  if (!lightning) return null;

  const now = Date.now();
  const recentStrikes = lightning.strikes.filter((s) => {
    const age = now - new Date(s.time).getTime();
    return age < 60 * 60 * 1000;
  });

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-lg">{lightning.active ? '⚡' : '🌤️'}</span>
          <div>
            <p className="text-xs font-bold text-slate-800">Tormentas y rayos</p>
            <p className="text-[11px] text-slate-500">
              {lightning.active
                ? `${lightning.strikeCount} rayo${lightning.strikeCount !== 1 ? 's' : ''} en el área${lightning.nearestStrikeKm !== null ? ` · más cercano a ${lightning.nearestStrikeKm.toFixed(0)} km` : ''}`
                : 'Sin actividad eléctrica'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SourceBadge source={lightning.source} />
          <span className="text-slate-600 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <StrikeMap strikes={recentStrikes} size={220} />

            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Rayos 1h</p>
                <p className="mt-1 text-xl font-black text-slate-900">{recentStrikes.length}</p>
              </div>
              <div className={`rounded-xl border p-2.5 text-center ${lightning.nearestStrikeKm !== null ? distanceLabel(lightning.nearestStrikeKm) : 'text-slate-700 bg-slate-50 border-slate-100'}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Más cercano</p>
                <p className="mt-1 text-xl font-black">
                  {lightning.nearestStrikeKm !== null ? `${lightning.nearestStrikeKm.toFixed(0)} km` : '—'}
                </p>
              </div>
            </div>

            {lightning.strikeCount > 0 && (
              <div className="w-full">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Impactos recientes</p>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {recentStrikes.slice(0, 10).map((s, i) => {
                    const ageMin = Math.round((now - new Date(s.time).getTime()) / 60000);
                    return (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5">
                        <span className={`inline-block h-2 w-2 rounded-full ${s.distanceKm < 5 ? 'bg-rose-500' : s.distanceKm < 15 ? 'bg-amber-400' : s.distanceKm < 30 ? 'bg-yellow-300' : 'bg-sky-300'}`} />
                        <span className="text-xs text-slate-700">{fmtN(s.distanceKm, 1)} km · {s.bearing}</span>
                        <span className="text-[11px] text-slate-600">{ageMin < 1 ? 'ahora' : `hace ${ageMin} min`}</span>
                      </div>
                    );
                  })}
                  {recentStrikes.length > 10 && (
                    <p className="text-center text-[11px] text-slate-600">+{recentStrikes.length - 10} más</p>
                  )}
                </div>
              </div>
            )}

            <p className="text-[11px] text-slate-600">{lightning.message}</p>
            <p className="text-[10px] text-slate-300">
              Actualizado: {new Date(lightning.lastCheckedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
