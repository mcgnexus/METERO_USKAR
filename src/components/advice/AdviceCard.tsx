import type { Advice } from '@/lib/weather-advice/types';
import { StatusBadge } from '@/components/common/StatusBadge';

const borderColor: Record<string, string> = {
  good:    'border-emerald-300',
  caution: 'border-amber-300',
  bad:     'border-red-300',
  neutral: 'border-slate-300',
};

export function AdviceCard({ advice }: { advice: Advice }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${borderColor[advice.status]} p-3.5 shadow-sm`}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-800">{advice.title}</h3>
        <StatusBadge status={advice.status} />
      </div>
      <p className="text-xs font-semibold text-slate-700 mb-1">{advice.label}</p>
      <p className="text-xs text-slate-600 leading-relaxed">{advice.message}</p>
      {advice.reason && (
        <p className="text-[11px] text-slate-400 italic mt-1.5">{advice.reason}</p>
      )}
    </div>
  );
}
