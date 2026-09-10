'use client';

import dynamic from 'next/dynamic';
import { LazyMount } from '@/components/common/LazyMount';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useApiData } from '@/hooks/useApiData';
import type { ZoneEstimation, WeatherPayload } from '@/types/weather';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { ForecastPayload } from '@/types/forecast';

function ChartSkeleton({ title, className = 'h-72' }: { title: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-2xl border border-slate-100 bg-white/60 ${className}`}>
      <div className="text-center">
        <div className="mx-auto h-4 w-32 animate-pulse rounded bg-slate-200" />
        <p className="mt-3 text-xs font-semibold text-slate-400">{title}</p>
      </div>
    </div>
  );
}

const MiniStationChart = dynamic(() => import('@/components/visualizacion/MiniStationChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando estación en miniatura" className="h-56" />,
});
const CurrentGauges = dynamic(() => import('@/components/visualizacion/CurrentGauges'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando medidas actuales" className="h-36" />,
});
const TemperatureChart = dynamic(() => import('@/components/visualizacion/TemperatureChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando gráfica de temperatura" className="h-80" />,
});
const WaterChart = dynamic(() => import('@/components/visualizacion/WaterChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando gráfica de agua" className="h-80" />,
});
const WindChart = dynamic(() => import('@/components/visualizacion/WindChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando gráfica de viento" className="h-72" />,
});
const SoilChart = dynamic(() => import('@/components/visualizacion/SoilChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando gráfica de suelo" className="h-72" />,
});
const ZoneChart = dynamic(() => import('@/components/visualizacion/ZoneChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando microclimas por zona" className="h-64" />,
});
const ConfidenceGauges = dynamic(() => import('@/components/visualizacion/ConfidenceGauges'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando nivel de confianza" className="h-40" />,
});
const BiasComparisonChart = dynamic(() => import('@/components/visualizacion/BiasComparisonChart'), {
  ssr: false,
  loading: () => <ChartSkeleton title="Cargando comparación con AEMET" className="h-80" />,
});

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
      <LazyMount fallback={<ChartSkeleton title="Estación en miniatura" className="h-56" />}>
        <MiniStationChart />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Medidas actuales" className="h-36" />}>
        <CurrentGauges data={currentData} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Temperatura" className="h-80" />}>
        <TemperatureChart currentData={currentData} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Agua" className="h-80" />}>
        <WaterChart currentData={currentData} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Viento" className="h-72" />}>
        <WindChart forecastData={forecastData} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Suelo" className="h-72" />}>
        <SoilChart forecastData={forecastData} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Microclimas por zona" className="h-64" />}>
        <ZoneChart zones={zones.data ?? []} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Nivel de confianza" className="h-40" />}>
        <ConfidenceGauges currentData={currentData} calibrationData={calibrationData} />
      </LazyMount>
      <LazyMount fallback={<ChartSkeleton title="Comparación con AEMET" className="h-80" />}>
        <BiasComparisonChart forecastData={forecastData} />
      </LazyMount>
    </div>
  );
}