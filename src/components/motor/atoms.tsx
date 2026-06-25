import type { ReactNode } from 'react';
import { IndicatorHelp, type IndicatorKey } from '@/components/llano/indicator-help';

function helpForLabel(label: string): IndicatorKey | undefined {
  const lower = label.toLowerCase();
  if (lower.includes('confianza')) return 'confidence';
  if (lower.includes('sesgo')) return 'bias';
  if (lower.includes('eto') || lower.includes('et0')) return 'et0';
  if (lower.includes('vpd')) return 'vpd';
  if (lower.includes('cape')) return 'cape';
  if (lower.includes('invers')) return 'inversion';
  if (lower.includes('orograf')) return 'orographic';
  return undefined;
}

export function KpiCard({
  label,
  value,
  unit,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: ReactNode;
  tone?: 'default' | 'accent' | 'warning' | 'danger' | 'success';
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-sky-200 bg-sky-50/80'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/80'
        : tone === 'danger'
          ? 'border-rose-200 bg-rose-50/80'
          : tone === 'success'
            ? 'border-emerald-200 bg-emerald-50/80'
            : 'border-slate-200 bg-white';
  return (
    <div className={`rounded-[22px] border p-4 shadow-sm ${toneClass}`}>
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700">{label}<IndicatorHelp term={helpForLabel(label)} /></div>
      <p className="mt-2 text-2xl font-black text-slate-950">
        {value}
        {unit && <span className="ml-1 text-base font-bold text-slate-500">{unit}</span>}
      </p>
      {caption && <p className="mt-1 text-xs leading-5 text-slate-600">{caption}</p>}
    </div>
  );
}

export function FormulaChip({ label, formula }: { label: string; formula: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-950 p-4 text-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200">{label}</p>
      <p className="mt-2 overflow-x-auto whitespace-pre font-mono text-xs leading-5">{formula}</p>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    OK: { bg: 'bg-emerald-100 text-emerald-800', label: 'En vivo' },
    FALLBACK: { bg: 'bg-amber-100 text-amber-800', label: 'Estimado' },
    MISSING: { bg: 'bg-rose-100 text-rose-800', label: 'Sin dato' },
    DEGRADED: { bg: 'bg-amber-100 text-amber-800', label: 'Degradado' },
    ERROR: { bg: 'bg-rose-100 text-rose-800', label: 'Caído' },
  };
  const { bg, label } = config[status] ?? { bg: 'bg-slate-100 text-slate-700', label: status };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${bg}`}>{label}</span>;
}

export function ConfidenceBar({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const tone =
    clamped >= 75 ? 'bg-emerald-500' : clamped >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-sm font-bold tabular-nums text-slate-700">{clamped.toFixed(0)}%<IndicatorHelp term="confidence" /></span>
    </div>
  );
}

export function WarningBanner({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="text-xs font-bold uppercase tracking-[0.18em]">Avisos del modelo</p>
      <ul className="mt-2 space-y-1 text-sm leading-5">
        {warnings.map((w, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-amber-500">•</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function fmtNumber(value: number | null | undefined, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

export function fmtUnit(value: number | null | undefined, unit: string, digits = 1): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(digits)} ${unit}` : '—';
}
