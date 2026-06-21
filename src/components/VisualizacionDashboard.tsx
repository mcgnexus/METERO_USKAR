'use client';

import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useApiData } from '@/hooks/useApiData';
import CurrentGauges from '@/components/visualizacion/CurrentGauges';
import TemperatureChart from '@/components/visualizacion/TemperatureChart';
import WaterChart from '@/components/visualizacion/WaterChart';
import WindChart from '@/components/visualizacion/WindChart';
import SoilChart from '@/components/visualizacion/SoilChart';
import ZoneChart from '@/components/visualizacion/ZoneChart';
import ConfidenceGauges from '@/components/visualizacion/ConfidenceGauges';
import BiasComparisonChart from '@/components/visualizacion/BiasComparisonChart';
import MiniStationChart from '@/components/visualizacion/MiniStationChart';

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
      <TemperatureChart currentData={currentData} forecastData={forecastData} />
      <WaterChart currentData={currentData} forecastData={forecastData} />
      <WindChart forecastData={forecastData} />
      <SoilChart forecastData={forecastData} />
      <ZoneChart zones={zones.data ?? []} />
      <ConfidenceGauges currentData={currentData} calibrationData={calibrationData} />
      <BiasComparisonChart forecastData={forecastData} />
    </div>
  );
}
