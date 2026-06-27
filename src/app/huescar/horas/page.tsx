import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getForecastPayload } from '@/services/forecastPayloadService';
import { HorasPageClient } from '@/components/HorasPageClient';

export const dynamic = 'force-dynamic';

export default async function HuescarHorasPage() {
  const [weatherResult, forecastResult] = await Promise.allSettled([
    getCurrentWeatherPayload(),
    getForecastPayload(5),
  ]);

  return (
    <HorasPageClient
      initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
      initialForecastData={forecastResult.status === 'fulfilled' ? forecastResult.value : null}
    />
  );
}
