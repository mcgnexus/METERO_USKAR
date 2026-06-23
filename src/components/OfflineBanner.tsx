'use client';

function ageLabel(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h ${min % 60}min`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

export function OfflineBanner({ isStale, cachedAt }: { isStale: boolean; cachedAt: number | null }) {
  if (!isStale) return null;

  const age = cachedAt != null ? ageLabel(Date.now() - cachedAt) : null;

  return (
    <div
      className="flex items-center gap-2 rounded-[18px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900"
      role="status"
      aria-live="polite"
    >
      <span className="text-base">📡</span>
      <span className="font-semibold">
        Sin conexión
        {age && <span className="font-normal"> · datos de {age}</span>}
      </span>
    </div>
  );
}
