import { unstable_cache } from 'next/cache';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getForecastPayload } from '@/services/forecastPayloadService';
import { HoyPageClient } from '@/components/HoyPageClient';
import type { ForecastPayload } from '@/types/forecast';
import type { WeatherPayload } from '@/types/weather';

export const dynamic = 'force-dynamic';

const getCachedHomeData = unstable_cache(
  async () => Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
    getForecastPayload(5),
  ]),
  ['huescar-home-data-v1'],
  { revalidate: 60 },
);

function slimForecast(payload: ForecastPayload): ForecastPayload {
  return {
    ...payload,
    forecastDays: payload.forecastDays.map((d) => ({ ...d, hours: [] })),
  };
}

function slimWeather(payload: WeatherPayload): WeatherPayload {
  const h = payload.hourly;
  const N = Math.min(h.time.length, 24);
  return {
    ...payload,
    sources: [],
    sourceHealth: [],
    comparisonHourly: { aemet: null, openMeteo: null },
    hourly: {
      time: h.time.slice(0, N),
      temperatureC: h.temperatureC.slice(0, N),
      humidityPct: h.humidityPct.slice(0, N),
      precipitationProbabilityPct: h.precipitationProbabilityPct.slice(0, N),
      precipitationMm: h.precipitationMm.slice(0, N),
      weatherCode: h.weatherCode.slice(0, N),
      windSpeedKmh: h.windSpeedKmh.slice(0, N),
    },
    radar: undefined,
    nowcast: undefined,
    livestock: undefined,
    orographic: undefined,
  };
}

export default async function HuescarHoyPage() {
  const [climateResult, weatherResult, forecastResult] = await getCachedHomeData();

  return (
    <HoyPageClient
      initialClimateData={climateResult.status === 'fulfilled' ? climateResult.value : null}
      initialWeatherData={weatherResult.status === 'fulfilled' && weatherResult.value ? slimWeather(weatherResult.value) : null}
      initialForecastData={forecastResult.status === 'fulfilled' && forecastResult.value ? slimForecast(forecastResult.value) : null}
    />
  );
}
