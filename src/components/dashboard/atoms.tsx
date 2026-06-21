import type { SourceHealth } from '@/types/weather';

export function cn(neutral: string, ayto: string, variant: 'neutral' | 'ayto') {
  return variant === 'ayto' ? ayto : neutral;
}

export function SourceDot({ status }: { status: string }) {
  const color =
    status === 'OK' ? 'bg-emerald-500' : status === 'DEGRADED' ? 'bg-amber-500' : 'bg-rose-500';
  const title =
    status === 'OK' ? 'Datos en tiempo real' : status === 'DEGRADED' ? 'Datos degradados o antiguos' : 'Fuente no disponible';
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} title={title} />;
}

export function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    aviso: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    peligro: 'bg-orange-100 text-orange-800 border-orange-300',
    severo: 'bg-red-100 text-red-800 border-red-300',
  };
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${colors[level] ?? 'bg-slate-100 text-slate-700'}`}>
      {level}
    </span>
  );
}

export function OverviewMetric({
  label,
  value,
  caption,
  tone = 'default',
}: {
  label: string;
  value: string;
  caption: string;
  tone?: 'default' | 'accent' | 'warning';
}) {
  const toneClass =
    tone === 'accent'
      ? 'bg-sky-50 text-sky-900 border-sky-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-900 border-amber-100'
        : 'bg-white text-slate-900 border-slate-200';

  return (
    <div className={`rounded-[22px] border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-slate-600">{caption}</p>
    </div>
  );
}

export function statusLabel(source: SourceHealth): string {
  if (source.status === 'ERROR') return 'caido';
  if (source.status === 'DEGRADED') return 'degradado';
  const ageMin = source.dataAgeMinutes ?? 0;
  const isAemet = source.source === 'AEMET';
  if (ageMin <= 15) return 'en vivo';
  if (isAemet) {
    if (ageMin <= 90) return 'horario';
    return 'dato antiguo';
  }
  if (ageMin <= 60) return 'disponible';
  return 'dato antiguo';
}

export function ageDisplay(source: SourceHealth): string {
  if (source.dataAgeMinutes === undefined) return 'sin edad';
  const min = Math.round(source.dataAgeMinutes);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `hace ${h}h ${m}min` : `hace ${h}h`;
}
