'use client';

import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useWeatherData } from '@/hooks/useWeatherData';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { AgricultureSection } from '@/components/llano/agriculture';
import { RaifPanel } from '@/components/llano/RaifPanel';
import { ageFromIso, fmtN } from '@/components/llano/atoms';
import { weatherCodeDescription, weatherEmoji } from '@/lib/display';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';

function CampoHero({ climate, weather, alarmCount }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  alarmCount: number;
}) {
  const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const humidity = climate.nodes.localStation?.humidityPct ?? climate.extrapolation.humidityPct ?? climate.eto.inputs.humidityPct ?? weather?.current?.humidityPct;
  const windSpeed = climate.nodes.radiationWind.windSpeed2mKmh;
  const soil10 = climate.exoticVariables.soilTemp10cmC;
  const current = weather?.current;
  const sky = current ? `${weatherEmoji(current.weatherCode ?? 0)} ${weatherCodeDescription(current.weatherCode ?? 0)}` : 'Estado local calibrado';
  const updateAge = ageFromIso(climate.generatedAt);

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 text-white shadow-lg">
      <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.26),_transparent_44%),linear-gradient(135deg,rgba(15,23,42,1),rgba(21,128,61,0.78))] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
              Meteo Huéscar Campo
            </p>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Campo</h1>
            <p className="mt-2 max-w-sm text-sm leading-6 text-emerald-50/90">
              Riego, cultivos, suelo, heladas y ventanas de trabajo para Huéscar.
            </p>
          </div>
          {alarmCount > 0 && (
            <span className="shrink-0 rounded-full border border-rose-300/30 bg-rose-500/20 px-3 py-1.5 text-xs font-bold text-rose-50">
              🚨 {alarmCount}
            </span>
          )}
        </div>

        <div className="mt-5 rounded-[24px] border border-white/12 bg-white/10 p-4 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100">Dato local calibrado</p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-black text-orange-300">{fmtN(temp, 1)}°C</p>
              <p className="mt-1 text-sm font-bold text-white">{sky}</p>
            </div>
            <div className="text-right text-xs leading-5 text-emerald-50/80">
              <p>Humedad {fmtN(humidity, 0)}%</p>
              <p>Viento {windSpeed.toFixed(0)} km/h</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100/70">Suelo 10 cm</p>
              <p className="mt-1 text-lg font-black text-white">{fmtN(soil10, 1)}°C</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100/70">Actualizado</p>
              <p className="mt-1 text-lg font-black text-white">
                {updateAge !== null ? `${updateAge < 60 ? updateAge : Math.floor(updateAge / 60)}${updateAge < 60 ? ' min' : ' h'}` : 'Ahora'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

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

export default function AgriculturaDashboard({
  initialClimateData = null,
  initialWeatherData = null,
}: {
  initialClimateData?: ClimateCalibrationPayload | null;
  initialWeatherData?: WeatherPayload | null;
}) {
  const climate = useClimateCalibration('agri-pulse-climate', initialClimateData);
  const weather = useWeatherData('agri-pulse-weather', initialWeatherData);

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
      <CampoHero climate={climate.data} weather={weather.data} alarmCount={alarms.length} />
      <RaifPanel weather={weather.data ?? null} />
      <AgricultureSection
        agricultural={weather.data?.agricultural ?? null}
        climate={climate.data}
        precipitacionSemanal={precipitacionSemanal}
      />
    </div>
  );
}
