'use client';

import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useWeatherData } from '@/hooks/useWeatherData';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { PulseHero } from '@/components/llano/hero';
import { AgricultureSection } from '@/components/llano/agriculture';
import { RaifPanel } from '@/components/llano/RaifPanel';

function LoadingState() {
  return (
    <div className="surface-card flex min-h-[360px] items-center justify-center rounded-[28px] p-12">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-500" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="surface-card rounded-[28px] p-10 text-center">
      <p className="font-semibold text-red-500">No se pudo cargar la página de agricultura</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function AgriculturaDashboard() {
  const climate = useClimateCalibration('agri-pulse-climate');
  const weather = useWeatherData('agri-pulse-weather');

  if (climate.loading || weather.loading) {
    return <LoadingState />;
  }

  if (climate.error || !climate.data) {
    return <ErrorState message={climate.error?.message ?? 'Sin datos del motor climático'} />;
  }

  const alarms = buildAlarms(climate.data, {
    daily: weather.data?.daily,
    weather: weather.data,
    agricultural: weather.data?.agricultural,
  });

  const precipitacionSemanal = weather.data?.daily?.precipitationSumMm?.slice(0, 7).reduce((a, b) => a + b, 0) ?? null;

  return (
    <div className="space-y-6">
      <PulseHero climate={climate.data} weather={weather.data} alarmCount={alarms.length} />
      <RaifPanel weather={weather.data ?? null} />
      <AgricultureSection
        agricultural={weather.data?.agricultural ?? null}
        climate={climate.data}
        precipitacionSemanal={precipitacionSemanal}
      />
    </div>
  );
}
