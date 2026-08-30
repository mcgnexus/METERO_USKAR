import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { FuentesPageClient } from '@/components/FuentesPageClient';
import type { Metadata } from 'next';

export const revalidate = 60;
export const metadata: Metadata = { alternates: { canonical: '/huescar/fuentes' } };

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
