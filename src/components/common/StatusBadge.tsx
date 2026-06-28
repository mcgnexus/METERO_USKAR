import type { AdviceStatus } from '@/lib/weather-advice/types';

const config: Record<AdviceStatus, { bg: string; text: string; label: string }> = {
  good:    { bg: 'bg-emerald-100',    text: 'text-emerald-800',  label: 'Bien' },
  caution: { bg: 'bg-amber-100',      text: 'text-amber-800',   label: 'Precaución' },
  bad:     { bg: 'bg-red-100',        text: 'text-red-800',     label: 'Malo' },
  neutral: { bg: 'bg-slate-200',      text: 'text-slate-700',   label: 'Regular' },
};

export function StatusBadge({ status }: { status: AdviceStatus }) {
  const c = config[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
