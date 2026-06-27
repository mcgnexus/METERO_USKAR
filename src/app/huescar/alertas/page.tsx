import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { AlertasPageClient } from '@/components/AlertasPageClient';

export const dynamic = 'force-dynamic';

export default async function HuescarAlertasPage() {
  const [climateResult, weatherResult] = await Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
  ]);

  return (
    <AlertasPageClient
      initialClimateData={climateResult.status === 'fulfilled' ? climateResult.value : null}
      initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
    />
  );
}
