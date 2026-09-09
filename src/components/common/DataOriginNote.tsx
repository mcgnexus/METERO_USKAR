'use client';

import { fmtHourMadrid } from '@/lib/timezone';

/** Origen del dato tal y como lo percibe el usuario (punto 1.7). */
export type DataOrigin = 'forecast' | 'observed' | 'estimated' | 'recommendation';

export type DataConfidence = 'alta' | 'media' | 'baja';

const ORIGIN_META: Record<DataOrigin, { label: string; emoji: string; chip: string }> = {
  forecast: { label: 'Previsión', emoji: '🌤️', chip: 'border-sky-200 bg-sky-100 text-sky-800' },
  observed: { label: 'Observado', emoji: '📡', chip: 'border-emerald-200 bg-emerald-100 text-emerald-800' },
  estimated: { label: 'Estimado', emoji: '🧮', chip: 'border-amber-200 bg-amber-100 text-amber-900' },
  recommendation: { label: 'Recomendación', emoji: '💡', chip: 'border-violet-200 bg-violet-100 text-violet-800' },
};

const CONFIDENCE_LABEL: Record<DataConfidence, string> = {
  alta: 'Alta',
  media: 'Media',
  baja: 'Baja',
};

/**
 * Etiqueta de origen de un dato, visible junto al valor (no solo en /fuentes):
 * categoría (Previsión / Observado / Estimado / Recomendación), nivel de
 * confianza y hora de actualización en Madrid. `detail` se ofrece como tooltip
 * con la fuente concreta (modelo, sensor...).
 */
export function DataOriginNote({
  origin,
  confidence,
  updatedAt,
  detail,
}: {
  origin: DataOrigin;
  confidence?: DataConfidence | null;
  updatedAt?: string | null;
  detail?: string;
}) {
  const meta = ORIGIN_META[origin];
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-4 ${meta.chip}`}
      title={detail}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      <span>{meta.label}</span>
      {confidence && (
        <>
          <span aria-hidden="true">·</span>
          <span className="font-semibold">Confianza {CONFIDENCE_LABEL[confidence]}</span>
        </>
      )}
      {updatedAt && (
        <>
          <span aria-hidden="true">·</span>
          <span className="font-normal tabular-nums">{fmtHourMadrid(updatedAt)}</span>
        </>
      )}
    </span>
  );
}

/** 'buena'|'media'|'baja' (dataQuality del payload) → única confianza canónica. */
export function confidenceFromQuality(quality: 'buena' | 'media' | 'baja' | null | undefined): DataConfidence {
  if (!quality) return 'media';
  if (quality === 'buena') return 'alta';
  if (quality === 'media') return 'media';
  return 'baja';
}