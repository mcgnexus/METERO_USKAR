'use client';

import { ConfidenceBar, WarningBanner } from '@/components/motor/atoms';

export function QualityBanner({ confidencePct, warnings, generatedAt }: {
  confidencePct: number;
  warnings: string[];
  generatedAt: string;
}) {
  const tone =
    confidencePct >= 75 ? 'success' : confidencePct >= 50 ? 'warning' : 'danger';
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50/60'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/60'
        : 'border-rose-200 bg-rose-50/60';

  return (
    <section className={`rounded-[24px] border p-5 ${toneClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
            Calidad del diagnóstico
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {tone === 'success'
              ? 'El modelo tiene alta confianza en este diagnóstico.'
              : tone === 'warning'
                ? 'El modelo tiene confianza media: revise los avisos antes de tomar decisiones.'
                : 'El modelo tiene baja confianza: datos incompletos o degradados.'}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <ConfidenceBar pct={confidencePct} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>
          Generado {new Date(generatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      </div>
      {warnings.length > 0 && (
        <div className="mt-4">
          <WarningBanner warnings={warnings} />
        </div>
      )}
    </section>
  );
}
