'use client';

import dynamic from 'next/dynamic';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';

const AgriculturaDashboard = dynamic(() => import('@/components/AgriculturaDashboard'), {
  ssr: false,
  loading: () => (
    <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
      <p className="mt-3 text-sm font-semibold text-slate-600">Cargando Campo...</p>
    </div>
  ),
});

export default function AgriculturaClientShell({
  initialClimateData,
  initialWeatherData,
}: {
  initialClimateData: ClimateCalibrationPayload | null;
  initialWeatherData: WeatherPayload | null;
}) {
  return (
    <AgriculturaDashboard
      initialClimateData={initialClimateData}
      initialWeatherData={initialWeatherData}
    />
  );
}
