import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { AlertasPageClient } from '@/components/AlertasPageClient';
import type { Metadata } from 'next';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/huescar/alertas' } };

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
