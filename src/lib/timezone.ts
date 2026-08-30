export const MADRID_TZ = 'Europe/Madrid';

/** UTC ISO string → Madrid "HH:MM" */
export function fmtHourMadrid(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', {
    timeZone: MADRID_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** UTC ISO string → "DD/MM HH:MM" */
export function fmtDateHourMadrid(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', {
    timeZone: MADRID_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
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
