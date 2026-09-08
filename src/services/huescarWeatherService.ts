import { getCachedOrRefresh } from '@/lib/persistentCache';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getForecastPayload } from '@/services/forecastPayloadService';
import { fmtDateHourMadrid } from '@/lib/timezone';
import { primarySourceLabel } from '@/lib/dataQuality';
import { resolveDataSourceStatus } from '@/lib/sourceValidity';
import type { ForecastPayload } from '@/types/forecast';
import type {
  DataSource,
  HuescarWeatherResponse,
  NormalizedCurrent,
  NormalizedDayRecord,
  NormalizedHourRecord,
} from '@/types/weather-response';
import { WEATHER_TIMEZONE } from '@/types/weather-response';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { SourceHealth, WeatherPayload } from '@/types/weather';

const HUESCAR_NAME = 'Huéscar';

/** Un snapshot por las 5 pantallas: misma clave, misma instantánea. */
const UNIFIED_TTL_MS = 5 * 60_000;
const UNIFIED_STALE_MS = 15 * 60_000;

function isSourceHealth(h: SourceHealth | undefined): h is SourceHealth {
  return Boolean(h);
}

function buildModel(climate: ClimateCalibrationPayload | null, weather: WeatherPayload | null, forecast: ForecastPayload | null): string {
  const parts: string[] = [];
  if (climate) parts.push('Motor climático Llano');
  if (weather) parts.push(`Fusión: ${primarySourceLabel(weather.dataQuality?.primarySource ?? 'NONE')}`);
  if (forecast?.forecastSource) parts.push(`Modelo: ${forecast.forecastSource}`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin datos';
}

/**
 * Estado actual canónico. Prioriza la salida calibrada del motor (lo que ya
 * muestran las pantallas de /huescar) y rellena el resto con la observación
 * fusionada. Es la ÚNICA fuente para el titular en todas las pantallas.
 */
function buildCanonicalCurrent(climate: ClimateCalibrationPayload | null, weather: WeatherPayload | null): NormalizedCurrent {
  const fusedCurrent = weather?.current ?? null;
  const local = climate?.nodes.localStation ?? null;
  const hasTrustedSensor = climate?.calibration?.realTemperatureC != null && local?.status === 'OK';

  const temperatureC =
    climate?.calibration?.realTemperatureC ??
    climate?.interpolation?.estimatedTemperatureC ??
    fusedCurrent?.temperatureC ??
    0;
  const windFactor = climate?.microclimate?.windGustReductionFactor ?? 1;
  const humidityPct = local?.humidityPct ?? climate?.eto?.inputs?.humidityPct ?? fusedCurrent?.humidityPct ?? null;
  const windSpeedKmh = climate?.nodes?.radiationWind?.windSpeed2mKmh ?? fusedCurrent?.windSpeedKmh ?? 0;

  return {
    time: climate?.generatedAt ?? fusedCurrent?.time ?? weather?.fetchedAt ?? new Date(0).toISOString(),
    temperatureC,
    apparentTemperatureC: fusedCurrent?.apparentTemperatureC ?? temperatureC,
    humidityPct,
    windSpeedKmh,
    windGustKmh: fusedCurrent?.windGustKmh != null ? fusedCurrent.windGustKmh * windFactor : null,
    precipitationMm: fusedCurrent?.precipitationMm ?? 0,
    weatherCode: fusedCurrent?.weatherCode ?? 0,
    dewPointC: climate?.dewPoint?.dewPointC ?? fusedCurrent?.dewPointC ?? null,
    sourceName: hasTrustedSensor ? 'Sensor local auditado' : 'Motor climático (sin sensor propio)',
  };
}

function buildHourly(weather: WeatherPayload | null): NormalizedHourRecord[] {
  const h = weather?.hourly;
  if (!h?.time) return [];
  const src = weather?.source ?? 'open_meteo';
  return h.time.map((time, i) => ({
    time,
    temperatureC: h.temperatureC[i] ?? null,
    humidityPct: h.humidityPct[i] ?? null,
    precipitationProbabilityPct: h.precipitationProbabilityPct[i] ?? null,
    precipitationMm: h.precipitationMm[i] ?? null,
    weatherCode: h.weatherCode[i] ?? null,
    windSpeedKmh: h.windSpeedKmh[i] ?? null,
    sourceId: src,
  }));
}

function buildDaily(weather: WeatherPayload | null): NormalizedDayRecord[] {
  const d = weather?.daily;
  if (!d?.time) return [];
  const src = weather?.source ?? 'open_meteo';
  return d.time.map((date, i) => ({
    date,
    temperatureMaxC: d.temperatureMaxC[i] ?? null,
    temperatureMinC: d.temperatureMinC[i] ?? null,
    precipitationProbabilityPct: d.precipitationProbabilityPct[i] ?? null,
    precipitationSumMm: d.precipitationSumMm[i] ?? null,
    windGustKmh: d.windGustKmh[i] ?? null,
    weatherCode: d.weatherCode[i] ?? null,
    sourceId: src,
  }));
}

// ─── Nueva jerarquía de fuentes para el usuario ────────────────────────────

/** Mapa de `SourceHealth.source` → tipo de fuente para el usuario. */
const SOURCE_TYPE_MAP: Record<string, DataSource['type']> = {
  AEMET: 'official-alert',
  LOCAL_STATIONS: 'local-sensor',
  OPEN_METEO: 'forecast',
};

/** Mapa de `SourceHealth.source` → nombre legible. */
const SOURCE_NAME_MAP: Record<string, string> = {
  AEMET: 'AEMET (observación)',
  LOCAL_STATIONS: 'Sensor local TecRural',
  OPEN_METEO: 'Open-Meteo (ECMWF)',
};

/** Motor climático como fuente de tipo forecast (modelo propio). */
function engineDataSource(climate: ClimateCalibrationPayload): DataSource {
  const ok = climate.nodes.localStation?.status === 'OK';
  const message = ok
    ? 'Temperatura auditada por sensor local'
    : 'Sensor local sin datos: se usa interpolación de AEMET/Open-Meteo (sustitución informada)';
  return {
    name: 'Motor climático Llano',
    type: 'forecast',
    updatedAt: climate.generatedAt,
    status: resolveDataSourceStatus({
      type: 'forecast',
      name: 'Motor climático Llano',
      updatedAt: climate.generatedAt,
      health: 'OK',
    }),
    model: 'Interpolación física + calibración por sensor propio',
    message,
  };
}

/**
 * Jerarquía de fuentes para el usuario:
 *   1. Previsión → Open-Meteo (ECMWF)
 *   2. Avisos meteorológicos oficiales → AEMET
 *   3. Avisos fitosanitarios → RAIF
 *   4. Datos observados → sensores locales TecRural
 *
 * El estado se calcula con criterio temporal: si el dato es más viejo que la
 * validez máxima de su fuente se marca "stale"; nunca se presenta como actual.
 */
function buildUserSources(
  climate: ClimateCalibrationPayload | null,
  weather: WeatherPayload | null,
): DataSource[] {
  const sources: DataSource[] = [];

  // Fuentes de observación/previsión del weather payload
  for (const sh of weather?.sourceHealth ?? []) {
    if (!isSourceHealth(sh)) continue;
    const type = SOURCE_TYPE_MAP[sh.source] ?? 'forecast';
    const name = SOURCE_NAME_MAP[sh.source] ?? sh.source;
    sources.push({
      name,
      type,
      updatedAt: sh.dataTime ?? sh.checkedAt,
      status: resolveDataSourceStatus({
        type,
        name,
        updatedAt: sh.dataTime ?? sh.checkedAt,
        health: sh.status,
      }),
      message: sh.message,
    });
  }

  // Motor climático (propio, tipo forecast)
  if (climate) sources.push(engineDataSource(climate));

  // RAIF (servicio externo de avisos fitosanitarios, siempre disponible)
  sources.push({
    name: 'RAIF (Red de Alerta Fitosanitaria)',
    type: 'phytosanitary',
    updatedAt: weather?.fetchedAt ?? new Date(0).toISOString(),
    status: 'active',
    message: 'Avisos fitosanitarios de Andalucía',
  });

  return sources;
}

/** Marca de la instantánea: el instante más reciente entre los payloads usados. */
function pickGeneratedAt(climate: ClimateCalibrationPayload | null, weather: WeatherPayload | null, forecast: ForecastPayload | null): string {
  const candidates = [
    climate?.generatedAt,
    weather?.fetchedAt,
    forecast?.generatedAt,
  ].filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (candidates.length === 0) return new Date(0).toISOString();
  return candidates.reduce((latest, c) => (c > latest ? c : latest));
}

function assembleResponse(
  climate: ClimateCalibrationPayload | null,
  weather: WeatherPayload | null,
  forecast: ForecastPayload | null,
): HuescarWeatherResponse {
  const generatedAt = pickGeneratedAt(climate, weather, forecast);
  const elevation =
    climate?.location?.elevation ??
    (typeof weather?.elevation === 'number' ? weather.elevation : null) ??
    0;

  const alerts = weather?.alerts ?? [];
  return {
    schemaVersion: 1,
    municipality: 'huescar',
    location: {
      name: HUESCAR_NAME,
      lat: (typeof weather?.latitude === 'number' ? weather.latitude : climate?.location?.lat) ?? 0,
      lon: (typeof weather?.longitude === 'number' ? weather.longitude : climate?.location?.lon) ?? 0,
      elevation,
    },
    timezone: WEATHER_TIMEZONE,
    generatedAt,
    model: buildModel(climate, weather, forecast),
    current: buildCanonicalCurrent(climate, weather),
    hourly: buildHourly(weather),
    daily: buildDaily(weather),
    alerts,
    sources: buildUserSources(climate, weather),
    updatedAtLabel: `Actualizado ${fmtDateHourMadrid(generatedAt)} · ${WEATHER_TIMEZONE}`,
    climate,
    weather,
    forecast,
  };
}

async function loadUnified(): Promise<HuescarWeatherResponse> {
  const [climateResult, weatherResult, forecastResult] = await Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
    getForecastPayload(5),
  ]);

  return assembleResponse(
    climateResult.status === 'fulfilled' ? climateResult.value : null,
    weatherResult.status === 'fulfilled' && weatherResult.value ? weatherResult.value : null,
    forecastResult.status === 'fulfilled' && forecastResult.value ? forecastResult.value : null,
  );
}

/**
 * Respuesta única para /huescar, /horas, /semana, /alertas y /campo.
 * Una misma carga (ventana de caché) devuelve exactamente el mismo objeto,
 * por lo que todas las pantallas muestran los mismos valores y la misma hora.
 */
export async function getHuescarWeatherResponse(): Promise<HuescarWeatherResponse> {
  return getCachedOrRefresh({
    key: 'huescar:unified:v1',
    ttlMs: UNIFIED_TTL_MS,
    staleMs: UNIFIED_STALE_MS,
    load: loadUnified,
  });
}
