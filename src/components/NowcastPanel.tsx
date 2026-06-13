'use client';

import type { NowcastData } from '@/types/weather';

interface Props {
  nowcast: NowcastData;
  variant?: 'neutral' | 'ayto';
}

function levelColors(level: string) {
  switch (level) {
    case 'peligro':
      return { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-500' };
    case 'alerta':
      return { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', bar: 'bg-orange-500' };
    case 'aviso':
      return { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' };
    default:
      return { border: 'border-slate-200', bg: 'bg-white', text: 'text-slate-600', bar: 'bg-slate-300' };
  }
}

function trajectoryLabel(traj: string): { text: string; emoji: string } {
  switch (traj) {
    case 'increasing': return { text: 'Aumentando', emoji: '↑' };
    case 'decreasing': return { text: 'Disminuyendo', emoji: '↓' };
    case 'stable': return { text: 'Estable', emoji: '→' };
    default: return { text: 'Sin actividad', emoji: '—' };
  }
}

export default function NowcastPanel({ nowcast, variant = 'neutral' }: Props) {
  const c = levelColors(nowcast.level);
  const traj = trajectoryLabel(nowcast.trajectory);
  const maxBarHeight = 60;
  const maxMm = Math.max(nowcast.maxIntensityMm, 1);

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4 space-y-3`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-bold ${c.text}`}>Nowcasting (próximas 2h)</h3>
        <span className={`text-[10px] font-semibold uppercase ${c.text}`}>{nowcast.level}</span>
      </div>

      <p className="text-xs text-slate-600">{nowcast.message}</p>

      {nowcast.intervals.length > 0 && (
        <div className="flex items-end gap-1 h-16">
          {nowcast.intervals.map((iv, i) => {
            const h = Math.max(2, (iv.precipMm / maxMm) * maxBarHeight);
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`${iv.precipMm.toFixed(1)} mm`}>
                <div
                  className={`w-full rounded-t ${c.bar} transition-all`}
                  style={{ height: `${h}px`, opacity: iv.precipMm > 0.1 ? 1 : 0.2 }}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs">
        {nowcast.minutesToRain !== null && (
          <div className="rounded-lg bg-white/60 px-2 py-1">
            <span className="text-slate-500">Lluvia en</span>
            <p className={`font-bold ${c.text}`}>{nowcast.minutesToRain} min</p>
          </div>
        )}
        {nowcast.totalPrecipNext2h > 0 && (
          <div className="rounded-lg bg-white/60 px-2 py-1">
            <span className="text-slate-500">Acumulado 2h</span>
            <p className={`font-bold ${c.text}`}>{nowcast.totalPrecipNext2h.toFixed(1)} mm</p>
          </div>
        )}
        {nowcast.maxIntensityMm > 0 && (
          <div className="rounded-lg bg-white/60 px-2 py-1">
            <span className="text-slate-500">Intensidad máx.</span>
            <p className={`font-bold ${c.text}`}>{nowcast.maxIntensityMm.toFixed(1)} mm/15min</p>
          </div>
        )}
        <div className="rounded-lg bg-white/60 px-2 py-1">
          <span className="text-slate-500">Tendencia</span>
          <p className="font-bold text-slate-700">{traj.emoji} {traj.text}</p>
        </div>
      </div>

      {nowcast.stormDetected && (
        <div className="flex items-center gap-2 rounded-lg bg-red-100 border border-red-300 px-3 py-2">
          <span className="text-lg">⚡</span>
          <div className="text-xs">
            <span className="font-bold text-red-700">Tormenta detectada</span>
            {nowcast.stormDistanceKm !== null && (
              <span className="text-red-600"> · {nowcast.stormDistanceKm} km · {nowcast.stormBearing}</span>
            )}
          </div>
        </div>
      )}

      {nowcast.rainApproachingFrom && (
        <p className="text-[11px] text-slate-500">
          Precipitación aproximándose desde: <span className="font-medium">{nowcast.rainApproachingFrom}</span>
        </p>
      )}
    </div>
  );
}
