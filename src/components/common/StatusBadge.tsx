import type { AdviceStatus } from '@/lib/weather-advice/types';

const config: Record<AdviceStatus, { bg: string; text: string; label: string }> = {
  good:    { bg: 'bg-emerald-500/15',    text: 'text-emerald-600',  label: 'Bien' },
  caution: { bg: 'bg-amber-400/15',      text: 'text-amber-600',   label: 'Precaución' },
  bad:     { bg: 'bg-red-500/15',        text: 'text-red-600',     label: 'Malo' },
  neutral: { bg: 'bg-slate-400/15',      text: 'text-slate-600',   label: 'Regular' },
};

export function StatusBadge({ status }: { status: AdviceStatus }) {
  const c = config[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
