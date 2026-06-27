import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { CampoPageClient } from '@/components/CampoPageClient';

export const dynamic = 'force-dynamic';

export default async function HuescarCampoPage() {
  const [climateResult, weatherResult] = await Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
  ]);

  return (
    <CampoPageClient
      initialClimateData={climateResult.status === 'fulfilled' ? climateResult.value : null}
      initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
    />
  );
}
