import type { Advice, AdviceContext } from '@/lib/weather-advice/types';
import { generalAdvice } from '@/lib/weather-advice/generalAdvice';
import { clothingAdvice } from '@/lib/weather-advice/clothingAdvice';
import { laundryAdvice } from '@/lib/weather-advice/laundryAdvice';
import { walkingAdvice } from '@/lib/weather-advice/walkingAdvice';

type AdvisorEntry = { fn: (ctx: AdviceContext) => Advice; icon: string; label: string };

const ADVISORS: AdvisorEntry[] = [
  { fn: generalAdvice,  icon: '🌤️', label: 'General' },
  { fn: clothingAdvice, icon: '👔', label: 'Ropa' },
  { fn: laundryAdvice,  icon: '🧺', label: 'Tender' },
  { fn: walkingAdvice,  icon: '🚶', label: 'Pasear' },
];

export function QuickDecisionGrid({ ctx }: { ctx: AdviceContext }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {ADVISORS.map((a, i) => (
        <QuickCard key={i} icon={a.icon} label={a.label} advice={a.fn(ctx)} />
      ))}
    </div>
  );
}

function QuickCard({ icon, label, advice }: { icon: string; label: string; advice: Advice }) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[10px] font-semibold uppercase text-slate-500">{label}</span>
        <span className="ml-auto">{/* status indicator */}
          <span className={`inline-block w-2 h-2 rounded-full ${
            advice.status === 'good' ? 'bg-emerald-500' :
            advice.status === 'caution' ? 'bg-amber-400' :
            advice.status === 'bad' ? 'bg-red-500' : 'bg-slate-400'
          }`} />
        </span>
      </div>
      <p className="text-xs font-bold text-slate-800 leading-tight">{advice.label}</p>
    </div>
  );
}
