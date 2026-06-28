import { getCachedOrRefresh } from '@/lib/persistentCache';
import { getForecastPayload } from '@/services/forecastPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import type { ForecastPayload } from '@/types/forecast';
import type { WeatherPayload } from '@/types/weather';

type CachedPageData = {
  weather: WeatherPayload | null;
  forecast: ForecastPayload | null;
};

const PAGE_DATA_TTL_MS = 60_000;
const PAGE_DATA_STALE_MS = 15 * 60_000;

async function loadWeatherAndForecast(): Promise<CachedPageData> {
  const [weatherResult, forecastResult] = await Promise.allSettled([
    getCurrentWeatherPayload(),
    getForecastPayload(5),
  ]);

  return {
    weather: weatherResult.status === 'fulfilled' ? weatherResult.value : null,
    forecast: forecastResult.status === 'fulfilled' ? forecastResult.value : null,
  };
}

export async function getHorasPageData(): Promise<CachedPageData> {
  return getCachedOrRefresh({
    key: 'page:huescar:horas:v1',
    ttlMs: PAGE_DATA_TTL_MS,
    staleMs: PAGE_DATA_STALE_MS,
    load: loadWeatherAndForecast,
  });
}

export async function getSemanaPageData(): Promise<CachedPageData> {
  return getCachedOrRefresh({
    key: 'page:huescar:semana:v1',
    ttlMs: PAGE_DATA_TTL_MS,
    staleMs: PAGE_DATA_STALE_MS,
    load: loadWeatherAndForecast,
  });
}
