import type { DataSourceStatus, DataSourceType } from '@/types/weather-response';

/**
 * Control de datos obsoletos.
 *
 * Cada fuente tiene un tiempo máximo de validez (`maxAgeMinutes`). Si una
 * fuente supera ese tiempo, su dato se marca como "Desactualizado" (`stale`)
 * y NUNCA se presenta como actual. Si la consulta falló, se marca como
 * "No disponible" (`unavailable`).
 *
 * La validez se define por tipo de fuente (los dos tipos "forecast" comparten
 * umbral) con posibilidad de sobreescribir por nombre concreto.
 */

/** Tiempo máximo de validez (minutos) por tipo de fuente. */
export const SOURCE_MAX_AGE_MINUTES_BY_TYPE: Record<DataSourceType, number> = {
  forecast: 180, // modelos de previsión: Open-Meteo + motor climático
  'official-alert': 120, // observación/aviso AEMET
  phytosanitary: 1440, // avisos RAIF: se publican a diario
  'local-sensor': 60, // sensores TecRural: lecturas frecuentes
};

/** Sobreescritura por nombre concreto de fuente (más estricta/relajada). */
export const SOURCE_MAX_AGE_OVERRIDES: Record<string, number> = {};

export function maxAgeMinutes(type: DataSourceType, name?: string): number {
  if (name && SOURCE_MAX_AGE_OVERRIDES[name] != null) return SOURCE_MAX_AGE_OVERRIDES[name];
  return SOURCE_MAX_AGE_MINUTES_BY_TYPE[type];
}

export function ageMinutes(updatedAt: string, nowMs = Date.now()): number {
  const t = new Date(updatedAt).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return Math.max(0, (nowMs - t) / 60000);
}

export type SourceHealthLevel = 'OK' | 'DEGRADED' | 'ERROR' | 'UNKNOWN';

/**
 * Estado público de una fuente = f(antigüedad, salud de la consulta).
 *   - Consulta fallida        -> "unavailable" (mensaje claro de no respuesta).
 *   - Consulta degradada      -> "stale" (nunca se muestra como actual).
 *   - Dato más viejo que el límite -> "stale".
 *   - En otro caso            -> "active".
 */
export function resolveDataSourceStatus(params: {
  type: DataSourceType;
  updatedAt: string;
  health: SourceHealthLevel;
  name?: string;
  nowMs?: number;
}): DataSourceStatus {
  const { type, updatedAt, health, name } = params;
  if (health === 'ERROR') return 'unavailable';
  if (health === 'DEGRADED') return 'stale';
  const age = ageMinutes(updatedAt, params.nowMs);
  if (age > maxAgeMinutes(type, name)) return 'stale';
  return 'active';
}

/** ¿Requiere aviso al usuario (desactualizado o caído)? */
export function needsAttention(status: DataSourceStatus): boolean {
  return status !== 'active';
}

export function anyAttention(statuses: DataSourceStatus[]): boolean {
  return statuses.some(needsAttention);
}

/**
 * Etiqueta de calidad a mostrar. Nunca devuelve "Buena" cuando hay una fuente
 * desactualizada o caída (criterio: evitar mostrar "Calidad buena").
 */
export function effectiveQualityLabel(
  quality: 'buena' | 'media' | 'baja',
  hasAttention: boolean,
): string {
  if (!hasAttention) {
    if (quality === 'buena') return 'Buena';
    if (quality === 'media') return 'Media';
    return 'Baja';
  }
  // Hay una fuente desactualizada/caída: la calidad nunca puede ser "buena".
  if (quality === 'buena') return 'Media (con datos parciales)';
  return quality === 'media' ? 'Media' : 'Baja';
}
