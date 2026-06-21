'use client';

import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { PulseHero } from '@/components/llano/hero';
import { InminenteSection } from '@/components/llano/inminente';
import { AlarmBoard } from '@/components/llano/alarms';
import { Forecast24h } from '@/components/llano/forecast-24h';
import { Forecast5d } from '@/components/llano/forecast-5d';
import { ModelDisclosure } from '@/components/llano/disclosure';
import { AlarmToast } from '@/components/llano/alarm-toast';

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
      <p className="font-semibold text-red-500">No se pudo cargar la pagina de Huescar</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function LlanoPulseDashboard() {
  const climate = useClimateCalibration('llano-pulse-climate');
  const weather = useWeatherData('llano-pulse-weather');
  const forecast = useForecast(5, 'llano-pulse-forecast');

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

  return (
    <div className="space-y-6">
      <AlarmToast alarms={alarms} />
      <PulseHero climate={climate.data} weather={weather.data} alarmCount={alarms.length} />
      <InminenteSection weather={weather.data} />
      <AlarmBoard alarms={alarms} />
      <Forecast24h hourly={weather.data?.hourly} />
      <Forecast5d forecast={forecast.data} daily={weather.data?.daily} />
      <ModelDisclosure />
    </div>
  );
}
