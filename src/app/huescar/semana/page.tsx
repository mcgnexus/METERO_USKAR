import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getForecastPayload } from '@/services/forecastPayloadService';
import { SemanaPageClient } from '@/components/SemanaPageClient';

export const dynamic = 'force-dynamic';

export default async function HuescarSemanaPage() {
  const [weatherResult, forecastResult] = await Promise.allSettled([
    getCurrentWeatherPayload(),
    getForecastPayload(5),
  ]);

  return (
    <SemanaPageClient
      initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
      initialForecastData={forecastResult.status === 'fulfilled' ? forecastResult.value : null}
    />
  );
}
