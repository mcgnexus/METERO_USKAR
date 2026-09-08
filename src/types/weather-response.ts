import type { ClimateCalibrationPayload } from '@/types/climate';
import type { ForecastPayload } from '@/types/forecast';
import type { WeatherAlert, WeatherPayload } from '@/types/weather';

export const WEATHER_TIMEZONE = 'Europe/Madrid' as const;

/**
 * Contrato único de datos meteorológicos de Huéscar.
 *
 * Todas las pantallas públicas (/huescar, /horas, /semana, /alertas, /campo)
 * consumen UNA misma instancia de esta respuesta generada por el servidor con
 * una sola clave de caché. Así, una misma carga muestra los mismos valores en
 * todas las pantallas y todas muestran la misma hora de actualización.
 *
 * Convenciones normalizadas por el servidor:
 *  - Fechas/horas de arrays y `generatedAt`: ISO 8601 en UTC (sufijo "Z").
 *  - Etiquetas de día/hora de España centralizadas en `timezone` (Europe/Madrid).
 *  - Unidades: temperatura °C, humedad %, lluvia mm, viento km/h.
 *  - Códigos meteorológicos: WMO.
 */
/**
 * Fuente de datos normalizada para el usuario.
 *
 * Jerarquía de fuentes:
 *   1. Previsión horaria/diaria → Open-Meteo (ECMWF)
 *   2. Avisos meteorológicos oficiales → AEMET
 *   3. Avisos fitosanitarios → RAIF
 *   4. Datos observados → sensores locales TecRural
 *
 * Cada tarjeta/sentencia indica de qué fuente procede el dato.
 * Si una fuente falla, su status es "unavailable" y no se muestra como actual.
 */
export type DataSourceType = 'forecast' | 'official-alert' | 'phytosanitary' | 'local-sensor';
export type DataSourceStatus = 'active' | 'stale' | 'unavailable';

export interface DataSource {
  /** Nombre legible de la fuente (p. ej. "Open-Meteo ECMWF", "AEMET Baza"). */
  name: string;
  /** Categoría de la fuente para el usuario. */
  type: DataSourceType;
  /** Instante UTC ISO de la última actualización de esta fuente. */
  updatedAt: string;
  /** Estado de la fuente: active = datos frescos, stale = desactualizado, unavailable = error. */
  status: DataSourceStatus;
  /** Modelo concreto usado (p. ej. "ECMWF IFS", "AEMET 5051X"). */
  model?: string;
  /** Descripción legible del estado o problema. */
  message: string;
}

export interface NormalizedCurrent {
  /** Instante UTC ISO de la observación. */
  time: string;
  temperatureC: number;
  apparentTemperatureC: number | null;
  humidityPct: number | null;
  windSpeedKmh: number;
  windGustKmh: number | null;
  precipitationMm: number;
  weatherCode: number;
  dewPointC: number | null;
  /** Fuente que ha aportado el valor principal (calibrado vs. crudo). */
  sourceName: string;
}

export interface NormalizedHourRecord {
  /** Instante UTC ISO. */
  time: string;
  temperatureC: number | null;
  humidityPct: number | null;
  precipitationProbabilityPct: number | null;
  precipitationMm: number | null;
  weatherCode: number | null;
  windSpeedKmh: number | null;
  /** ID de la fuente que aportó este dato horario (p. ej. "open_meteo"). */
  sourceId: string;
}

export interface NormalizedDayRecord {
  /** Fecha "YYYY-MM-DD". */
  date: string;
  temperatureMaxC: number | null;
  temperatureMinC: number | null;
  precipitationProbabilityPct: number | null;
  precipitationSumMm: number | null;
  windGustKmh: number | null;
  weatherCode: number | null;
  /** ID de la fuente que aportó este dato diario (p. ej. "open_meteo"). */
  sourceId: string;
}

export interface HuescarWeatherResponse {
  schemaVersion: 1;
  municipality: string;
  location: { name: string; lat: number; lon: number; elevation: number };
  timezone: typeof WEATHER_TIMEZONE;
  /** Marca de tiempo UTC ISO de la instantánea (única para las 5 pantallas). */
  generatedAt: string;
  /** Nombre del modelo/fuente usado para generar esta respuesta. */
  model: string;
  /** Estado actual canónico: mismo valor en todas las pantallas. */
  current: NormalizedCurrent;
  hourly: NormalizedHourRecord[];
  daily: NormalizedDayRecord[];
  alerts: WeatherAlert[];
  /** Fuentes de datos normalizadas con jerarquía y estado para el usuario. */
  sources: DataSource[];
  /** Texto ya formateado en Europe/Madrid para mostrar en cabeceras. */
  updatedAtLabel: string;

  // Payloads de dominio que alimentan las vistas especializadas (sin recalcular
  // en cliente). Se exponen tal cual los genera el servidor para que la UI
  // existente siga funcionando sobre el mismo snapshot.
  climate: ClimateCalibrationPayload | null;
  weather: WeatherPayload | null;
  forecast: ForecastPayload | null;
}
