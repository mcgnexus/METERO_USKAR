import LlanoPulseDashboard from '@/components/LlanoPulseDashboard';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getForecastPayload } from '@/services/forecastPayloadService';

export const dynamic = 'force-dynamic';

export default async function HuescarPage() {
  const [climateResult, weatherResult, forecastResult] = await Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
    getForecastPayload(5),
  ]);

  const initialClimateData = climateResult.status === 'fulfilled' ? climateResult.value : null;
  const initialWeatherData = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  const initialForecastData = forecastResult.status === 'fulfilled' ? forecastResult.value : null;

  return (
    <LlanoPulseDashboard
      initialClimateData={initialClimateData}
      initialWeatherData={initialWeatherData}
      initialForecastData={initialForecastData}
    />
  );
}
