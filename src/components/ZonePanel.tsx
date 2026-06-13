'use client';

import { useEffect, useState } from 'react';
import type { ZoneEstimation } from '@/types/weather';
import { temperatureColor } from '@/lib/display';

interface Props {
  variant?: 'neutral' | 'ayto' | 'admin';
}

const TYPE_META: Record<string, { emoji: string; color: string; label: string }> = {
  URBAN: { emoji: '🏠', color: 'border-slate-300', label: 'Urbano' },
  VEGA: { emoji: '🌾', color: 'border-green-300', label: 'Vega/Regadío' },
  SECANO: { emoji: '🌻', color: 'border-amber-300', label: 'Secano' },
  MONTE: { emoji: '🌲', color: 'border-emerald-400', label: 'Monte' },
  RESERVOIR: { emoji: '💧', color: 'border-blue-300', label: 'Embalse' },
};

const FROST_COLORS: Record<string, string> = {
  none: 'text-green-600',
  media: 'text-yellow-600',
  alta: 'text-orange-600',
  muy_alta: 'text-red-600',
};

const FROST_LABELS: Record<string, string> = {
  none: 'Sin riesgo',
  media: 'Riesgo medio',
  alta: 'Riesgo alto',
  muy_alta: 'Riesgo muy alto',
};

export default function ZonePanel({ variant = 'neutral' }: Props) {
  const [zones, setZones] = useState<ZoneEstimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isAdmin = variant === 'admin';
  const shellClass = isAdmin
    ? 'rounded-xl border border-slate-700 bg-slate-900 p-4 space-y-3 text-slate-100'
    : 'rounded-xl border border-slate-200 bg-white p-4 space-y-3';
  const cardClass = isAdmin ? 'bg-slate-800/70' : 'bg-white/60';
  const titleClass = isAdmin ? 'text-slate-100' : 'text-slate-700';
  const mutedClass = isAdmin ? 'text-slate-400' : 'text-slate-400';

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/weather/zones', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setZones(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className={shellClass}>
        <h3 className={`text-sm font-bold mb-3 ${titleClass}`}>Zonas locales de Huéscar</h3>
        <div className="animate-pulse space-y-2">
          <div className={`h-16 rounded-lg ${isAdmin ? 'bg-slate-800' : 'bg-slate-100'}`} />
          <div className={`h-16 rounded-lg ${isAdmin ? 'bg-slate-800' : 'bg-slate-100'}`} />
        </div>
      </div>
    );
  }

  if (error || zones.length === 0) return null;

  const sorted = [...zones].sort((a, b) => a.temperatureC - b.temperatureC);
  const minTemp = sorted[0]?.temperatureC ?? 0;
  const maxTemp = sorted[sorted.length - 1]?.temperatureC ?? 0;
  const tempRange = maxTemp - minTemp;

  return (
    <div className={shellClass}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${titleClass}`}>Zonas locales de Huéscar</h3>
        {tempRange > 0 && (
          <span className={`text-[10px] ${mutedClass}`}>
            Δ {tempRange.toFixed(1)}°C entre zonas
          </span>
        )}
      </div>

      <div className="space-y-2">
        {zones.map((zone) => {
          const meta = TYPE_META[zone.type] ?? TYPE_META.URBAN;
          return (
            <div
              key={zone.name}
              className={`rounded-lg border ${meta.color} ${cardClass} p-2.5`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base shrink-0">{meta.emoji}</span>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isAdmin ? 'text-slate-100' : 'text-slate-700'}`}>{zone.name}</p>
                    <p className={`text-[10px] truncate ${mutedClass}`}>
                      {meta.label} · {zone.distanceToCenterKm} km · {zone.elevation}m
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold" style={{ color: temperatureColor(zone.temperatureC) }}>
                    {zone.temperatureC.toFixed(1)}°C
                  </p>
                  <p className={`text-[10px] ${mutedClass}`}>{zone.humidityPct}% HR</p>
                </div>
              </div>

              <div className={`flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] ${isAdmin ? 'text-slate-300' : 'text-slate-500'}`}>
                {zone.zoneTempAdjC !== 0 && (
                  <span>
                    Zona: <span className={zone.zoneTempAdjC > 0 ? 'text-orange-500' : 'text-blue-500'}>
                      {zone.zoneTempAdjC > 0 ? '+' : ''}{zone.zoneTempAdjC.toFixed(1)}°C
                    </span>
                  </span>
                )}
                {zone.precipitationMm > 0 && (
                  <span>🌧 {zone.precipitationMm.toFixed(1)}mm</span>
                )}
                <span className={FROST_COLORS[zone.frostRisk]}>
                  ❄ {FROST_LABELS[zone.frostRisk]}
                </span>
                {zone.irrigationNeedMm !== undefined && (
                  <span className="text-blue-500">
                    💧 Riego: {zone.irrigationNeedMm.toFixed(1)}mm
                  </span>
                )}
                <span className="text-slate-400">{zone.confidencePct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
