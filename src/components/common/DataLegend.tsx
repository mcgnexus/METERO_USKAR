'use client';

import { useState } from 'react';
import {
  freshnessChipClass,
  freshnessLabel,
  type FreshnessLevel,
} from '@/lib/freshness';

const ORIGIN_ITEMS: { key: string; emoji: string; label: string; description: string }[] = [
  { key: 'observed', emoji: '📡', label: 'Observado', description: 'Medido por estación o sensor.' },
  { key: 'estimated', emoji: '🧮', label: 'Estimado', description: 'Calculado a partir de otros datos.' },
  { key: 'forecast', emoji: '🌤️', label: 'Previsión', description: 'Predicción de modelo, no medida.' },
  { key: 'recommendation', emoji: '💡', label: 'Recomendación', description: 'Orientación derivada; contrasta en parcela.' },
];

/**
 * Leyenda global de estados de dato. Única referencia visual para todo el
 * sitio: qué es observado, estimado, previsto o recomendado, y qué significa
 * fresco / degradado / obsoleto.
 */
export function DataLegend({ freshnessLevels }: { freshnessLevels?: FreshnessLevel[] }) {
  const [open, setOpen] = useState(false);
  const levels: FreshnessLevel[] = freshnessLevels ?? ['fresco', 'degradado', 'obsoleto'];

  return (
    <section
      aria-label="Leyenda de estados de los datos"
      className="rounded-2xl border border-slate-200 bg-white/80 px-3 py-2 text-[11px] leading-5 text-slate-600"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {ORIGIN_ITEMS.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1 font-semibold text-slate-700">
            <span aria-hidden="true">{item.emoji}</span> {item.label}
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto rounded-full border border-slate-300 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
        >
          {open ? 'Ocultar detalle' : '¿Qué significa?'}
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2">
          <ul className="space-y-0.5">
            {ORIGIN_ITEMS.map((item) => (
              <li key={item.key}>
                <span aria-hidden="true">{item.emoji}</span> <span className="font-semibold">{item.label}</span>: {item.description}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-1">
            {levels.map((level) => (
              <span key={level} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${freshnessChipClass(level)}`}>
                {freshnessLabel(level)}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
