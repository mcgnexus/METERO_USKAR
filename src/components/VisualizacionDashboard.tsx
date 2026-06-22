'use client';

import dynamic from 'next/dynamic';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useApiData } from '@/hooks/useApiData';

const MiniStationChart = dynamic(() => import('@/components/visualizacion/MiniStationChart'));
const CurrentGauges = dynamic(() => import('@/components/visualizacion/CurrentGauges'));
const TemperatureChart = dynamic(() => import('@/components/visualizacion/TemperatureChart'));
const WaterChart = dynamic(() => import('@/components/visualizacion/WaterChart'));
const WindChart = dynamic(() => import('@/components/visualizacion/WindChart'));
const SoilChart = dynamic(() => import('@/components/visualizacion/SoilChart'));
const ZoneChart = dynamic(() => import('@/components/visualizacion/ZoneChart'));
const ConfidenceGauges = dynamic(() => import('@/components/visualizacion/ConfidenceGauges'));
const BiasComparisonChart = dynamic(() => import('@/components/visualizacion/BiasComparisonChart'));

function ChartFallback() {
  return (
    <div className="surface-card flex min-h-[280px] items-center justify-center rounded-[28px]">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
    </div>
  );
}

export default function VisualizacionDashboard() {
  const { data: currentData, loading: loadingCurrent } = useWeatherData();
  const { data: forecastData, loading: loadingForecast } = useForecast(7);
  const { data: calibrationData } = useClimateCalibration();
  const zones = useApiData<any[]>('/api/weather/zones');

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
