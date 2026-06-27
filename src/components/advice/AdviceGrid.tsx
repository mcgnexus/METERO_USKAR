import type { Advice, AdviceContext } from '@/lib/weather-advice/types';
import { generalAdvice } from '@/lib/weather-advice/generalAdvice';
import { clothingAdvice } from '@/lib/weather-advice/clothingAdvice';
import { laundryAdvice } from '@/lib/weather-advice/laundryAdvice';
import { walkingAdvice, elderlyAdvice } from '@/lib/weather-advice/walkingAdvice';
import { AdviceCard } from './AdviceCard';

export function AdviceGrid({ ctx }: { ctx: AdviceContext }) {
  const items: Advice[] = [
    generalAdvice(ctx),
    clothingAdvice(ctx),
    laundryAdvice(ctx),
    walkingAdvice(ctx),
    elderlyAdvice(ctx),
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((a, i) => (
        <AdviceCard key={i} advice={a} />
      ))}
    </div>
  );
}
