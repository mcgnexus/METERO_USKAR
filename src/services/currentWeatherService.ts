import { HUESCAR_COORDS } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { WeatherPayload } from "@/types/weather";
import { fetchLightningData } from "@/services/lightningService";
import { fetchNowcast } from "@/services/nowcastService";
import { fetchRadarPrecipitation } from "@/services/radarService";
import { aggregateWeather } from "@/services/weatherAggregator";

const CURRENT_WEATHER_CACHE_KEY = "weather:current-payload:v1";
const CURRENT_WEATHER_CACHE_TTL_MS = 60_000;

export class WeatherUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherUnavailableError";
  }
}

function hasOperationalWeatherData(weather: WeatherPayload): boolean {
  return weather.source !== "ERROR" && weather.sources.length > 0;
}

export async function getCurrentWeatherPayload(): Promise<WeatherPayload> {
  const cached = cacheGet<WeatherPayload>(CURRENT_WEATHER_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const weather = await aggregateWeather();
  if (!hasOperationalWeatherData(weather)) {
    throw new WeatherUnavailableError(
      weather.confidenceExplanation || "No hay datos meteorológicos operativos."
    );
  }

  const lightning = await fetchLightningData(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, 20).catch(() => null);

  const [radar, nowcast] = await Promise.all([
    fetchRadarPrecipitation(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon).catch(() => null),
    fetchNowcast(
      HUESCAR_COORDS.lat,
      HUESCAR_COORDS.lon,
      weather.current.windDirectionDeg ?? undefined,
      lightning
    ).catch(() => null),
  ]);

  const payload: WeatherPayload = {
    ...weather,
    lightning: lightning ?? undefined,
    radar: radar ?? undefined,
    nowcast: nowcast ?? undefined,
  };

  cacheSet(CURRENT_WEATHER_CACHE_KEY, payload, CURRENT_WEATHER_CACHE_TTL_MS);
  return payload;
}
