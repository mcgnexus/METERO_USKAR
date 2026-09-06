export const MADRID_TZ = 'Europe/Madrid';

const HAS_TZ_DESIGNATOR = /(?:[Zz]|[+-]\d{2}:?\d{2})$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ISO naive que representa hora local con offset conocido (p. ej. Open-Meteo
 * con timezone=auto/Europe/Madrid devuelve "2026-09-06T14:00" en hora Madrid)
 * → instante UTC real en ISO con "Z". Date-only, strings con designador de
 * zona o inválidos se devuelven tal cual.
 */
export function naiveLocalToUtcIso(iso: string, offsetSeconds: number): string {
  if (!iso || DATE_ONLY.test(iso) || HAS_TZ_DESIGNATOR.test(iso)) return iso;
  const asUtc = Date.parse(`${iso}Z`);
  if (Number.isNaN(asUtc)) return iso;
  return new Date(asUtc - offsetSeconds * 1000).toISOString();
}

/**
 * ISO naive que ya representa UTC (p. ej. "fint" de AEMET) → ISO UTC
 * normalizado con "Z". Acepta sufijo "utc" y designadores de zona existentes.
 */
export function naiveUtcToUtcIso(iso: string): string {
  if (!iso) return iso;
  const cleaned = iso.replace(/utc$/i, '').trim();
  const t = Date.parse(HAS_TZ_DESIGNATOR.test(cleaned) ? cleaned : `${cleaned}Z`);
  return Number.isNaN(t) ? iso : new Date(t).toISOString();
}

/** Compute age in minutes from a UTC ISO string to now. Always ≥ 0. */
export function ageMinutes(iso: string): number {
  return Math.max(0, (Date.now() - new Date(iso).getTime()) / 60_000);
}

/** Human-readable age in Spanish: "menos de 1 min", "3 min", "1h 23min" */
export function ageDisplay(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m === 0) return 'menos de 1 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}min` : `${h}h`;
}

/** "Actualizado hace X" with staleness warning */
export function updatedLabel(iso: string, staleMinutes = 120): { text: string; isStale: boolean } {
  const min = ageMinutes(iso);
  const isStale = min > staleMinutes;
  const suffix = isStale ? ' — datos desactualizados' : '';
  return { text: `Actualizado hace ${ageDisplay(min)}${suffix}`, isStale };
}

/** UTC ISO string → Madrid "HH:MM" */
export function fmtHourMadrid(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', {
    timeZone: MADRID_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** UTC ISO string → "DD/MM HH:MM" (Europe/Madrid) */
export function fmtDateHourMadrid(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    timeZone: MADRID_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** UTC ISO string → Madrid long date: "lunes, 3 de enero" */
export function fmtDayMonthMadrid(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    timeZone: MADRID_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** UTC ISO string → Madrid date label: "Hoy", "Mañana", or day name */
export function fmtDayLabelMadrid(iso: string): string {
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat('es-ES', { timeZone: MADRID_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateStr = formatter.format(d);

  const now = new Date();
  const todayStr = formatter.format(now);
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = formatter.format(tomorrow);

  if (dateStr === todayStr) return 'Hoy';
  if (dateStr === tomorrowStr) return 'Mañana';

  const weekday = new Intl.DateTimeFormat('es-ES', { timeZone: MADRID_TZ, weekday: 'long' }).format(d);
  return weekday;
}

/** Current hour in Madrid (0-23) */
export function madridHourNow(): number {
  return parseInt(
    new Intl.DateTimeFormat('es-ES', { timeZone: MADRID_TZ, hour: 'numeric', hour12: false }).format(new Date()),
    10,
  );
}

/** Is it daytime in Madrid now? (07:00–20:00) */
export function isDaytimeNow(): boolean {
  const h = madridHourNow();
  return h >= 7 && h < 20;
}

/** Extract Madrid hour (0-23) from a UTC ISO string */
export function madridHourFromUTC(iso: string): number {
  return parseInt(
    new Intl.DateTimeFormat('es-ES', { timeZone: MADRID_TZ, hour: 'numeric', hour12: false }).format(new Date(iso)),
    10,
  );
}

/** Extract Madrid month (0-11) from a UTC ISO string */
export function madridMonthFromUTC(iso: string): number {
  return parseInt(
    new Intl.DateTimeFormat('es-ES', { timeZone: MADRID_TZ, month: 'numeric' }).format(new Date(iso)),
    10,
  ) - 1;
}

/** Get season from month (0-11) */
export function seasonFromMonth(month: number): 'spring' | 'summer' | 'autumn' | 'winter' {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}
