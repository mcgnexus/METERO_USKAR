'use client';

import { useApiData } from '@/hooks/useApiData';
import type { ZoneEstimation } from '@/types/weather';
import { fmtN } from '@/components/llano/atoms';

const TYPE_EMOJI: Record<string, string> = {
  URBAN: '🏠',
  VEGA: '🌿',
  SECANO: '🌾',
  MONTE: '⛰️',
  RESERVOIR: '💧',
};

function tempColor(t: number): string {
  if (t <= 0) return '#60a5fa';
  if (t <= 10) return '#22d3ee';
  if (t <= 20) return '#34d399';
  if (t <= 30) return '#fbbf24';
  if (t <= 35) return '#f97316';
  return '#ef4444';
}

function frostBadge(risk: string): { label: string; cls: string } | null {
  switch (risk) {
    case 'media': return { label: 'Helada media', cls: 'bg-amber-100 text-amber-800' };
    case 'alta': return { label: 'Helada alta', cls: 'bg-orange-100 text-orange-800' };
    case 'muy_alta': return { label: 'Helada muy alta', cls: 'bg-rose-100 text-rose-800' };
    default: return null;
  }
}

export function ZoneSection() {
  const { data: zones, loading, error } = useApiData<ZoneEstimation[]>('/api/weather/zones', 'data-tab-zones');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-slate-400" />
      </div>
    );
  }

  if (error || !zones || zones.length === 0) {
    return <p className="py-4 text-sm text-slate-500">Datos de zonas no disponibles</p>;
  }

  const temps = zones.map(z => z.temperatureC);
  const range = temps.length > 0 ? Math.max(...temps) - Math.min(...temps) : 0;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        {zones.length} zonas · Δ {range.toFixed(1)}°C entre la más cálida y la más fría
      </p>

      {zones.map((z) => {
        const frost = frostBadge(z.frostRisk);
        return (
          <div key={z.name} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{TYPE_EMOJI[z.type] ?? '📍'}</span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{z.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {z.type} · {z.elevation.toFixed(0)} m · {z.distanceToCenterKm.toFixed(1)} km
                  </p>
                </div>
              </div>
              <p className="text-lg font-black tabular-nums" style={{ color: tempColor(z.temperatureC) }}>
                {fmtN(z.temperatureC, 1)}°
              </p>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-600">
              <span>💧 {z.humidityPct.toFixed(0)}%</span>
              <span>💨 {z.windSpeedKmh.toFixed(0)} km/h</span>
              {z.precipitationMm > 0 && <span>☔ {z.precipitationMm.toFixed(1)} mm</span>}
              {z.irrigationNeedMm != null && z.irrigationNeedMm > 0 && (
                <span className="font-semibold text-sky-700">🚿 {z.irrigationNeedMm.toFixed(1)} L/m²</span>
              )}
              <span className="text-slate-400">conf. {z.confidencePct.toFixed(0)}%</span>
            </div>
            {frost && (
              <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${frost.cls}`}>
                {frost.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
