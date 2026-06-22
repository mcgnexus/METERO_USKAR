import type { SourceObservation, HourlyWeather, DailyWeather } from "@/types/weather";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

export interface OpenMeteoForecastResult {
  observations: SourceObservation[];
  hourly: HourlyWeather;
  daily: DailyWeather;
  status: "LIVE" | "FRESH_CACHE" | "STALE_CACHE";
}

// M2 — Caché escalonada para Open-Meteo (igual que AEMET)
const OM_CACHE_KEY = "open_meteo_forecast";
const OM_FRESH_TTL_MS = 10 * 60 * 1000;       // 10 minutos de caché fresca
const OM_STALE_TTL_MS = 2 * 60 * 60 * 1000;   // 2 horas de caché de respaldo

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  elevation: number
): Promise<OpenMeteoForecastResult> {
  // M2 — Intentar caché fresca primero
  const fresh = cacheGet<OpenMeteoForecastResult>(OM_CACHE_KEY);
  if (fresh) return { ...fresh, status: "FRESH_CACHE" };

  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&elevation=${elevation}` +
    // C2 — Solicitar apparent_temperature explícitamente
    // C3 — Solicitar wind_direction_10m y weather_code explícitamente
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,et0_fao_evapotranspiration,weather_code` +
    `&timezone=auto&forecast_days=14`;

  let data: Record<string, unknown>;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }
    data = await response.json();
  } catch (err) {
    // M2 — Fallback a caché obsoleta si la API falla
    const stale = cacheGet<OpenMeteoForecastResult>(`${OM_CACHE_KEY}_stale`);
    if (stale) {
      return { ...stale, status: "STALE_CACHE" };
    }
    throw err;
  }

  const now = new Date();
  const current = data.current as Record<string, unknown> | undefined;

  const observation: SourceObservation = {
    source: "OPEN_METEO",
    locationName: "Huescar",
    time: (current?.time as string | undefined) ?? now.toISOString(),
    observationPeriod: "current",
    dataAgeMinutes: 0,
    qualityScore: 0.9,
    status: "OK",
    retrievalStatus: "LIVE",
    // C2 — Temperatura aparente real de Open-Meteo
    temperatureC: (current?.temperature_2m as number | undefined) ?? 0,
    apparentTemperatureC: (current?.apparent_temperature as number | undefined) ?? undefined,
    humidityPct: (current?.relative_humidity_2m as number | undefined) ?? 0,
    precipitationMm: (current?.precipitation as number | undefined) ?? 0,
    windSpeedKmh: (current?.wind_speed_10m as number | undefined) ?? 0,
    windGustKmh: (current?.wind_gusts_10m as number | undefined) ?? 0,
    // C3 — Dirección del viento y código del tiempo
    windDirectionDeg: (current?.wind_direction_10m as number | undefined) ?? undefined,
    weatherCode: (current?.weather_code as number | undefined) ?? undefined,
  };

  const hourlyRaw = data.hourly as Record<string, unknown> | undefined;
  const hourly: HourlyWeather = {
    time: (hourlyRaw?.time as string[]) ?? [],
    temperatureC: (hourlyRaw?.temperature_2m as number[]) ?? [],
    humidityPct: (hourlyRaw?.relative_humidity_2m as number[]) ?? [],
    precipitationProbabilityPct: (hourlyRaw?.precipitation_probability as number[]) ?? [],
    precipitationMm: (hourlyRaw?.precipitation as number[]) ?? [],
    weatherCode: (hourlyRaw?.weather_code as number[]) ?? [],
    windSpeedKmh: (hourlyRaw?.wind_speed_10m as number[]) ?? [],
  };

  const dailyRaw = data.daily as Record<string, unknown> | undefined;
  const daily: DailyWeather = {
    time: (dailyRaw?.time as string[]) ?? [],
    temperatureMaxC: (dailyRaw?.temperature_2m_max as number[]) ?? [],
    temperatureMinC: (dailyRaw?.temperature_2m_min as number[]) ?? [],
    precipitationProbabilityPct: (dailyRaw?.precipitation_probability_max as number[]) ?? [],
    precipitationSumMm: (dailyRaw?.precipitation_sum as number[]) ?? [],
    windGustKmh: (dailyRaw?.wind_gusts_10m_max as number[]) ?? [],
    et0Mm: (dailyRaw?.et0_fao_evapotranspiration as number[]) ?? [],
    weatherCode: (dailyRaw?.weather_code as number[]) ?? [],
  };

  const result: OpenMeteoForecastResult = { observations: [observation], hourly, daily, status: "LIVE" };

  // M2 — Guardar en caché fresca y de respaldo
  cacheSet(OM_CACHE_KEY, result, OM_FRESH_TTL_MS);
  cacheSet(`${OM_CACHE_KEY}_stale`, result, OM_STALE_TTL_MS);

  return result;
}
