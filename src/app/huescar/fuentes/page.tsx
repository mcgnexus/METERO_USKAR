import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { FuentesPageClient } from '@/components/FuentesPageClient';

export const dynamic = 'force-dynamic';

export default async function HuescarFuentesPage() {
  const [weatherResult, climateResult] = await Promise.allSettled([
    getCurrentWeatherPayload(),
    getClimateCalibrationPayload(),
  ]);

  return (
    <FuentesPageClient
      initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
      initialClimateData={climateResult.status === 'fulfilled' ? climateResult.value : null}
    />
  );
}
