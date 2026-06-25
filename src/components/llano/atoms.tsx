import type { ReactNode } from 'react';
import { IndicatorHelp, type IndicatorKey } from '@/components/llano/indicator-help';

export function KpiChip({ label, value, unit, caption, tone = 'default', help }: {
  label: string;
  value: string;
  unit?: string;
  caption?: ReactNode;
  tone?: 'default' | 'accent' | 'warning' | 'danger' | 'success';
  help?: IndicatorKey;
}) {
  const toneClass =
    tone === 'accent' ? 'border-sky-200 bg-sky-50/80'
      : tone === 'warning' ? 'border-amber-200 bg-amber-50/80'
        : tone === 'danger' ? 'border-rose-200 bg-rose-50/80'
          : tone === 'success' ? 'border-emerald-200 bg-emerald-50/80'
            : 'border-slate-200 bg-white';
  return (
    <div className={`min-w-0 overflow-hidden rounded-[22px] border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">{label}<IndicatorHelp term={help} /></p>
      <p className="mt-2 text-2xl font-black leading-tight text-slate-950">
        {value}
        {unit && <span className="ml-1 text-sm font-bold text-slate-700">{unit}</span>}
      </p>
      {caption && <p className="mt-1 break-words text-xs leading-4 text-slate-700">{caption}</p>}
    </div>
  );
}

export function SourceBadge({ source, status, ageMinutes, className = '' }: {
  source: 'sensor_propio' | 'modelo_calibrado' | 'aemet' | 'open_meteo';
  status: 'OK' | 'FALLBACK' | 'MISSING' | 'DEGRADED' | null;
  ageMinutes: number | null;
  className?: string;
}) {
  const sourceLabel = {
    sensor_propio: 'Tu sensor',
    modelo_calibrado: 'Modelo calibrado',
    aemet: 'AEMET Baza + corrección',
    open_meteo: 'Open-Meteo',
  }[source];
  const statusLabel = {
    OK: 'en vivo',
    FALLBACK: 'estimado',
    MISSING: 'sin dato',
    DEGRADED: 'degradado',
  }[status ?? 'MISSING'];
  const tone = status === 'OK' ? 'bg-emerald-100 text-emerald-800'
    : status === 'FALLBACK' ? 'bg-amber-100 text-amber-800'
      : 'bg-rose-100 text-rose-800';
  const age =
    ageMinutes === null
      ? ''
      : ageMinutes < 60
        ? ` · hace ${ageMinutes} min`
        : ageMinutes < 60 * 24
          ? ` · hace ${Math.floor(ageMinutes / 60)}h`
          : ` · hace ${Math.floor(ageMinutes / 60 / 24)}d`;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone} ${className}`}>
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {sourceLabel} · {statusLabel}{age}
    </span>
  );
}

export function ConfidenceInline({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tone = clamped >= 75 ? 'bg-emerald-500' : clamped >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/20">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-bold tabular-nums">{clamped.toFixed(0)}%</span>
    </div>
  );
}

export function fmtN(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export function fmtU(value: number | null | undefined, unit: string, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)} ${unit}` : '—';
}

export function ageFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / 60000));
}
