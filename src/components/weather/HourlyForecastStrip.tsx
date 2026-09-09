'use client';

import { useState } from 'react';
import { fmt, weatherEmoji } from '@/lib/display';
import { fmtHourMadrid, fmtDayLabelMadrid } from '@/lib/timezone';

type HourBlock = {
  time: string;
  temp: number;
  weatherCode?: number;
  precipitationProb?: number | null;
};

type Props = {
  /** Día completo de horas (normalmente desde las 00:00 de hoy). */
  hours: HourBlock[];
  /** Instante UTC ISO de referencia ("ahora") para anclar la vista por defecto. */
  nowIso?: string;
  /** Cuántas horas mostrar tras "Ahora" en la vista por defecto (sin contar el día completo). */
  lookahead?: number;
};

/**
 * Franja horaria. Por defecto arranca en "Ahora" y muestra las próximas horas
 * reales; ofrece un toggle para ver el día completo desde las 00:00 (vista
 * secundaria). Si no se indica `nowIso`, muestra desde las 00:00.
 */
export function HourlyForecastStrip({ hours, nowIso, lookahead = 6 }: Props) {
  const [fromMidnight, setFromMidnight] = useState(false);
  const [showMore, setShowMore] = useState(false);

  if (!hours || hours.length === 0) return null;

  const defaultCount = 1 + lookahead; // "Ahora" + próximas horas
  // "Ahora" = la hora en curso (piso al inicio de la hora) para que la franja
  // no salte la hora actual si la instantánea cae a los pocos minutos.
  const nowFloorMs = nowIso ? (() => { const d = new Date(nowIso); d.setMinutes(0, 0, 0); return d.getTime(); })() : 0;
  const startIndex = nowIso
    ? Math.max(0, hours.findIndex((h) => new Date(h.time).getTime() >= nowFloorMs))
    : 0;

  // Vista "ahora": desde la hora actual (ocultando las horas ya pasadas).
  const fromNow = hours.slice(startIndex);
  // Vista "desde medianoche": el día completo.
  const visible = fromMidnight ? hours : fromNow;
  const display = fromMidnight || showMore ? visible : visible.slice(0, defaultCount);
  const hasMoreNow = !fromMidnight && fromNow.length > defaultCount;

  return (
    <div>
      <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin">
        {display.map((h, i) => {
          const isNow = !fromMidnight && i === 0;
          return (
            <div
              key={`${h.time}-${i}`}
              className={`flex flex-col items-center gap-1 min-w-[56px] ${isNow ? 'rounded-xl bg-sky-600 px-1 py-1 text-white' : ''}`}
            >
              <span className={`text-[10px] font-semibold uppercase ${isNow ? 'text-white' : 'text-slate-500'}`}>
                {isNow ? 'Ahora' : fromMidnight && i === 0 ? fmtDayLabelMadrid(h.time) : fmtHourMadrid(h.time)}
              </span>
              <span className="text-xl">{weatherEmoji(h.weatherCode ?? 0)}</span>
              <span className={`text-sm font-bold ${isNow ? 'text-white' : 'text-slate-800'}`}>
                {fmt(h.temp, 1)}°
              </span>
              {h.precipitationProb != null && h.precipitationProb > 0 && (
                <span className={`text-[10px] ${isNow ? 'text-sky-100' : 'text-blue-500'}`}>
                  {h.precipitationProb}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex gap-1 rounded-full bg-slate-100 p-0.5">
          <button
            onClick={() => { setFromMidnight(false); setShowMore(false); }}
            className={`rounded-full px-3 py-1 font-semibold transition ${!fromMidnight ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Ahora
          </button>
          <button
            onClick={() => { setFromMidnight(true); setShowMore(false); }}
            className={`rounded-full px-3 py-1 font-semibold transition ${fromMidnight ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Desde medianoche
          </button>
        </div>
        {hasMoreNow && (
          <button
            onClick={() => setShowMore(!showMore)}
            className="text-blue-600 font-semibold"
          >
            {showMore ? 'Mostrar menos' : 'Ver más horas'}
          </button>
        )}
      </div>
    </div>
  );
}
