'use client';

import { useState } from 'react';
import { fmtDateHourMadrid } from '@/lib/timezone';
import { levelBadge, levelClass, levelEmoji, levelLabel } from '@/components/llano/alarms-logic';
import type { UnifiedAlert } from '@/types/alerts';

/**
 * Tarjeta de alerta unificada. SIEMPRE muestra fuente, nivel, fecha y acción
 * recomendada, sea meteorológica, fitosanitaria o recomendación agronómica.
 */
export function UnifiedAlertCard({ alert, defaultOpen = false }: { alert: UnifiedAlert; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`w-full rounded-[22px] border p-4 text-left transition-all hover:shadow-md ${levelClass(alert.level)}`}>
      <button type="button" className="w-full text-left" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${levelBadge(alert.level)}`}>
                {levelEmoji(alert.level)} {levelLabel(alert.level)}
              </span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">📍 {alert.source}</span>
              <time dateTime={alert.date} className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">
                {fmtDateHourMadrid(alert.date)}
              </time>
            </div>
            <h4 className="mt-2 text-base font-black">{levelEmoji(alert.level)} {alert.title}</h4>
            <p className="mt-1.5 text-xs leading-5 opacity-85"><span className="font-bold">Qué ocurre:</span> {alert.message}</p>
            {alert.audience && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">👥 {alert.audience}</p>
            )}
          </div>
          <span className="mt-1 shrink-0 text-lg opacity-40">{open ? '⌃' : '›'}</span>
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <div className="rounded-lg bg-white/70 p-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">✅ Acción recomendada</p>
            <p className="text-xs leading-5">{alert.action}</p>
          </div>
          {alert.url && (
            <a
              href={alert.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-white"
            >
              Fuente oficial →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function UnifiedEmptyState({ emoji, title, message }: { emoji: string; title: string; message: string }) {
  return (
    <div className="rounded-[22px] border border-emerald-200 bg-emerald-50/70 p-5 text-center">
      <p className="text-2xl">{emoji}</p>
      <p className="mt-1 text-sm font-black text-emerald-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-emerald-700">{message}</p>
    </div>
  );
}
