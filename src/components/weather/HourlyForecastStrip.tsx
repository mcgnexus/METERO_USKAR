'use client';

import { useState } from 'react';
import { fmt, weatherEmoji } from '@/lib/display';

type HourBlock = {
  time: string;
  temp: number;
  weatherCode?: number;
  precipitationProb?: number | null;
};

export function HourlyForecastStrip({ hours }: { hours: HourBlock[] }) {
  const [expanded, setExpanded] = useState(false);

  if (!hours || hours.length === 0) return null;

  const display = expanded ? hours : hours.slice(0, 6);

  return (
    <div>
      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin">
        {display.map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 min-w-[56px]">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">
              {h.time.slice(11, 16)}
            </span>
            <span className="text-xl">{weatherEmoji(h.weatherCode ?? 0)}</span>
            <span className="text-sm font-bold text-slate-800">{fmt(h.temp, 1)}°</span>
            {h.precipitationProb != null && h.precipitationProb > 0 && (
              <span className="text-[10px] text-blue-500">{h.precipitationProb}%</span>
            )}
          </div>
        ))}
      </div>
      {hours.length > 6 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 font-medium mt-2 mx-auto block"
        >
          {expanded ? 'Mostrar menos' : `Ver ${hours.length - 6} horas más`}
        </button>
      )}
    </div>
  );
}
