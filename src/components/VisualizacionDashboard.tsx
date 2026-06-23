'use client';

import dynamic from 'next/dynamic';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useApiData } from '@/hooks/useApiData';
import type { ZoneEstimation, WeatherPayload } from '@/types/weather';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { ForecastPayload } from '@/types/forecast';

const MiniStationChart = dynamic(() => import('@/components/visualizacion/MiniStationChart'));
const CurrentGauges = dynamic(() => import('@/components/visualizacion/CurrentGauges'));
const TemperatureChart = dynamic(() => import('@/components/visualizacion/TemperatureChart'));
const WaterChart = dynamic(() => import('@/components/visualizacion/WaterChart'));
const WindChart = dynamic(() => import('@/components/visualizacion/WindChart'));
const SoilChart = dynamic(() => import('@/components/visualizacion/SoilChart'));
const ZoneChart = dynamic(() => import('@/components/visualizacion/ZoneChart'));
const ConfidenceGauges = dynamic(() => import('@/components/visualizacion/ConfidenceGauges'));
const BiasComparisonChart = dynamic(() => import('@/components/visualizacion/BiasComparisonChart'));

export default function VisualizacionDashboard({
  initialCurrentData = null,
  initialForecastData = null,
  initialCalibrationData = null,
  initialZonesData = null,
}: {
  initialCurrentData?: WeatherPayload | null;
  initialForecastData?: ForecastPayload | null;
  initialCalibrationData?: ClimateCalibrationPayload | null;
  initialZonesData?: ZoneEstimation[] | null;
}) {
  const { data: currentData, loading: loadingCurrent } = useWeatherData('visualizacion-current', initialCurrentData);
  const { data: forecastData, loading: loadingForecast } = useForecast(7, 'visualizacion-forecast', initialForecastData);
  const { data: calibrationData } = useClimateCalibration('visualizacion-climate', initialCalibrationData);
  const zones = useApiData<ZoneEstimation[]>('/api/weather/zones', 'visualizacion-zones', initialZonesData);

  const loading = loadingCurrent || loadingForecast;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MiniStationChart />
      <CurrentGauges data={currentData} />
      <TemperatureChart currentData={currentData} />
      <WaterChart currentData={currentData} />
      <WindChart forecastData={forecastData} />
      <SoilChart forecastData={forecastData} />
      <ZoneChart zones={zones.data ?? []} />
      <ConfidenceGauges currentData={currentData} calibrationData={calibrationData} />
      <BiasComparisonChart forecastData={forecastData} />
    </div>
  );
}
