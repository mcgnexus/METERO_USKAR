export type FreshnessLevel = 'fresco' | 'degradado' | 'obsoleto';

export type FreshnessVariable =
  | 'temperatura'
  | 'lluvia'
  | 'humedad_suelo'
  | 'humedad_aire'
  | 'viento'
  | 'prevision'
  | 'aviso';

type Thresholds = { freshMinutes: number; degradedMinutes: number };

/**
 * Umbrales por variable: NO se usa el mismo umbral para temperatura,
 * lluvia y humedad del suelo. La lluvia caduca rápido (cambia minuto a
 * minuto); la humedad del suelo tolera más (varía despacio).
 */
export const FRESHNESS_THRESHOLDS_MINUTES: Record<FreshnessVariable, Thresholds> = {
  temperatura: { freshMinutes: 60, degradedMinutes: 180 },
  lluvia: { freshMinutes: 30, degradedMinutes: 90 },
  humedad_suelo: { freshMinutes: 120, degradedMinutes: 360 },
  humedad_aire: { freshMinutes: 60, degradedMinutes: 180 },
  viento: { freshMinutes: 60, degradedMinutes: 180 },
  prevision: { freshMinutes: 180, degradedMinutes: 360 },
  aviso: { freshMinutes: 120, degradedMinutes: 240 },
};

export const REFRESH_INTERVAL_MINUTES: Record<FreshnessVariable, number> = {
  temperatura: 30,
  lluvia: 15,
  humedad_suelo: 60,
  humedad_aire: 30,
  viento: 30,
  prevision: 180,
  aviso: 60,
};

export function resolveFreshness(
  variable: FreshnessVariable,
  updatedAt: string | number | null | undefined,
  nowMs: number = Date.now()
): { level: FreshnessLevel; ageMinutes: number; thresholds: Thresholds } {
  const thresholds = FRESHNESS_THRESHOLDS_MINUTES[variable];
  if (updatedAt === null || updatedAt === undefined) {
    return { level: 'obsoleto', ageMinutes: Infinity, thresholds };
  }
  const t = typeof updatedAt === 'number' ? updatedAt : Date.parse(updatedAt);
  if (!Number.isFinite(t)) return { level: 'obsoleto', ageMinutes: Infinity, thresholds };
  const ageMinutes = Math.max(0, (nowMs - t) / 60000);
  if (ageMinutes <= thresholds.freshMinutes) return { level: 'fresco', ageMinutes, thresholds };
  if (ageMinutes <= thresholds.degradedMinutes) return { level: 'degradado', ageMinutes, thresholds };
  return { level: 'obsoleto', ageMinutes, thresholds };
}

export function freshnessLabel(level: FreshnessLevel): string {
  switch (level) {
    case 'fresco':
      return 'Dato fresco';
    case 'degradado':
      return 'Dato degradado (puede estar desactualizado)';
    case 'obsoleto':
      return 'Dato obsoleto';
  }
}

export function freshnessChipClass(level: FreshnessLevel): string {
  switch (level) {
    case 'fresco':
      return 'bg-emerald-100 text-emerald-800';
    case 'degradado':
      return 'bg-amber-100 text-amber-900';
    case 'obsoleto':
      return 'bg-rose-100 text-rose-800';
  }
}

export function describeAge(ageMinutes: number): string {
  if (!Number.isFinite(ageMinutes)) return 'antigüedad desconocida';
  if (ageMinutes < 1) return 'hace menos de 1 min';
  if (ageMinutes < 60) return `hace ${Math.round(ageMinutes)} min`;
  const hours = ageMinutes / 60;
  if (hours < 24) return `hace ${Math.round(hours)} h`;
  return `hace ${Math.round(hours / 24)} días`;
}

export function nextRefreshLabel(variable: FreshnessVariable, updatedAt: string | number | null | undefined): string {
  if (updatedAt === null || updatedAt === undefined) return 'próxima actualización: sin fecha';
  const t = typeof updatedAt === 'number' ? updatedAt : Date.parse(updatedAt);
  if (!Number.isFinite(t)) return 'próxima actualización: sin fecha';
  const next = t + REFRESH_INTERVAL_MINUTES[variable] * 60000;
  return `próxima actualización ≈ ${new Date(next).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Sensor caído: el último valor recibido se conserva pero NUNCA se
 * presenta como actual. Devuelve null si no hay ningún valor previo.
 */
export function formatLastReceived(params: {
  value: string;
  receivedAt: string | number | null | undefined;
  nowMs?: number;
}): string | null {
  if (!params.receivedAt) return null;
  const t = typeof params.receivedAt === 'number' ? params.receivedAt : Date.parse(params.receivedAt);
  if (!Number.isFinite(t)) return null;
  const when = new Date(t).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  return `${params.value} (último valor recibido · ${when} · ${describeAge(((params.nowMs ?? Date.now()) - t) / 60000)})`;
}

/** Mensaje accionable por estado de API; evita skeletons infinitos. */
export function apiStatusMessage(params: {
  loading: boolean;
  error: Error | null;
  hasData: boolean;
  attempts?: number;
}): string | null {
  if (!params.loading && params.error) {
    if (params.hasData) {
      return 'No se pudo actualizar. Se muestran los últimos datos disponibles; usa "Reintentar".';
    }
    if ((params.attempts ?? 0) >= 2) {
      return 'El servicio no responde tras varios intentos. Comprueba tu conexión y prueba de nuevo en unos minutos.';
    }
    return 'No se pudo cargar el dato. Puedes reintentarlo ahora.';
  }
  if (params.loading && (params.attempts ?? 0) >= 2) {
    return 'La carga está tardando más de lo normal. Puedes seguir usando el resto de la página.';
  }
  return null;
}
