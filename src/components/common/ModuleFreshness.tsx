'use client';

import { fmtHourMadrid } from '@/lib/timezone';
import {
  describeAge,
  formatLastReceived,
  freshnessChipClass,
  freshnessLabel,
  nextRefreshLabel,
  resolveFreshness,
  type FreshnessVariable,
} from '@/lib/freshness';

/**
 * Línea de trazabilidad por módulo:
 * `fuente · hora local · antigüedad · próxima actualización`
 * más el estado de frescura según la variable (umbral propio).
 */
export function ModuleFreshness({
  variable,
  source,
  updatedAt,
  nowMs,
  sensorDown,
  lastValue,
}: {
  variable: FreshnessVariable;
  source: string;
  updatedAt: string | number | null | undefined;
  nowMs?: number;
  /** la consulta a la fuente falló; se conserva el último valor recibido */
  sensorDown?: boolean;
  /** representación textual del último valor recibido (sensor caído) */
  lastValue?: string | null;
}) {
  const fresh = resolveFreshness(variable, updatedAt, nowMs);
  const lastReceived = sensorDown && lastValue ? formatLastReceived({ value: lastValue, receivedAt: updatedAt, nowMs }) : null;

  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-4 text-slate-500">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${freshnessChipClass(fresh.level)}`}>
        {freshnessLabel(fresh.level)}
      </span>
      <span className="font-semibold text-slate-600">{source}</span>
      <span aria-hidden="true">·</span>
      <span className="tabular-nums">
        {updatedAt != null && fresh.ageMinutes !== Infinity ? `${fmtHourMadrid(new Date(updatedAt).toISOString())} (${describeAge(fresh.ageMinutes)})` : 'sin hora de actualización'}
      </span>
      <span aria-hidden="true">·</span>
      <span>{nextRefreshLabel(variable, updatedAt)}</span>
      {lastReceived && (
        <span className="w-full font-semibold text-amber-800">
          {lastReceived} — no es un dato actual.
        </span>
      )}
    </p>
  );
}
