'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { NavBottom } from '@/components/NavBottom';
import { NotificationPermission } from '@/components/NotificationPermission';
import { LocalAlarmNotifier } from '@/components/LocalAlarmNotifier';
import { LightningPanel } from '@/components/llano/lightning-panel';
import { TodaySummaryCard } from '@/components/weather/TodaySummaryCard';
import { HourlyForecastStrip } from '@/components/weather/HourlyForecastStrip';
import { QuickDecisionGrid } from '@/components/weather/QuickDecisionGrid';
import { AdviceGrid } from '@/components/advice/AdviceGrid';
import { SectionTitle } from '@/components/common/SectionTitle';
import PwaRegister from '@/components/PwaRegister';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';
import type { AdviceContext } from '@/lib/weather-advice/types';

const WeekTrend = dynamic(() => import('@/components/llano/week-tab').then((m) => ({ default: m.WeekTab })), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />,
});

export function HoyPageClient({
  initialClimateData,
  initialWeatherData,
  initialForecastData,
}: {
  initialClimateData: ClimateCalibrationPayload | null;
  initialWeatherData: WeatherPayload | null;
  initialForecastData: ForecastPayload | null;
}) {
  const cd = initialClimateData;
  const wd = initialWeatherData;
  const fd = initialForecastData;

  const alarms = useMemo(() => {
    if (!cd) return [];
    return buildAlarms(cd, {
      daily: wd?.daily,
      weather: wd,
      agricultural: wd?.agricultural,
    });
  }, [cd, wd]);

  const adviceCtx = useMemo((): AdviceContext | null => {
    if (!cd) return null;
    const local = cd.nodes.localStation;
    const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
    const humidity = local?.humidityPct ?? cd.eto.inputs.humidityPct ?? wd?.current?.humidityPct ?? null;
    const windSpeed = cd.nodes.radiationWind.windSpeed2mKmh ?? 0;
    const windGust = wd?.current?.windGustKmh != null
      ? wd.current.windGustKmh * cd.microclimate.windGustReductionFactor
      : null;
    const now = new Date(cd.generatedAt);
    const month = now.getMonth();
    return {
      tempC: temp,
      feelsLikeC: wd?.current?.apparentTemperatureC ?? temp,
      humidityPct: humidity,
      windSpeedKmh: windSpeed,
      windGustKmh: windGust,
      precipitationProbPct: wd?.hourly?.precipitationProbabilityPct?.[0] ?? null,
      precipitationMm: wd?.hourly?.precipitationMm?.[0] ?? null,
      cloudCoverPct: cd.exoticVariables.cloudCoverPct ?? null,
      weatherCode: wd?.current?.weatherCode ?? 0,
      isDaytime: now.getHours() >= 7 && now.getHours() < 20,
      month,
      season: month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter',
    };
  }, [cd, wd]);

  if (!cd) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] flex items-center justify-center">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
  const humidity = cd.nodes.localStation?.humidityPct ?? cd.eto.inputs.humidityPct ?? wd?.current?.humidityPct ?? null;
  const windSpeed = cd.nodes.radiationWind.windSpeed2mKmh ?? 0;
  const wcode = wd?.current?.weatherCode ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <LocalAlarmNotifier alarms={alarms} />
      <div className="mx-auto max-w-lg px-4 pt-4" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
              <h1 className="mt-0.5 text-xl font-black text-slate-900">Meteo Huéscar</h1>
            </div>
          </div>
        </header>

        <div className="mb-3 min-h-[92px]">
          <NotificationPermission />
        </div>

        {wd?.lightning && (
          <div className="mb-3">
            <LightningPanel lightning={wd.lightning} />
          </div>
        )}

        <PwaRegister />

        <main className="space-y-5">
          <TodaySummaryCard forecast={wd?.current ?? {
            time: cd.generatedAt,
            temperatureC: temp,
            apparentTemperatureC: temp,
            humidityPct: humidity ?? 50,
            precipitationMm: wd?.current?.precipitationMm ?? 0,
            weatherCode: wcode,
            windSpeedKmh: windSpeed,
            windDirectionDeg: cd.extrapolation.bazaWindDirectionDeg ?? 0,
            windGustKmh: wd?.current?.windGustKmh ?? 0,
            solarRadiationWm2: cd.eto.inputs.solarRadiationWm2 ?? 0,
            et0Mm: cd.eto.etoHourlyMm ?? 0,
          }} />

          {adviceCtx && (
            <section>
              <SectionTitle>⚡ Decisiones rápidas</SectionTitle>
              <QuickDecisionGrid ctx={adviceCtx} />
            </section>
          )}

          {wd?.hourly && wd.hourly.time.length > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <SectionTitle>🕐 Próximas horas</SectionTitle>
              <HourlyForecastStrip
                hours={wd.hourly.time.slice(0, 8).map((t, i) => ({
                  time: t,
                  temp: wd.hourly.temperatureC[i],
                  weatherCode: wd.hourly.weatherCode[i] ?? 0,
                  precipitationProb: wd.hourly.precipitationProbabilityPct[i] ?? null,
                }))}
              />
            </section>
          )}

          {fd && fd.forecastDays && fd.forecastDays.length > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <SectionTitle>📅 Tendencia semanal</SectionTitle>
              <WeekTrend daily={wd?.daily ?? null} forecast={fd} />
            </section>
          )}

          {adviceCtx && (
            <section>
              <SectionTitle>💡 Consejos para hoy</SectionTitle>
              <AdviceGrid ctx={adviceCtx} />
            </section>
          )}

          <section className="border border-slate-200 rounded-2xl bg-white p-4 shadow-sm">
            <SectionTitle>📊 Datos técnicos</SectionTitle>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <DataRow label="Viento medio" value={`${windSpeed.toFixed(0)} km/h`} />
              <DataRow label="Ráfagas" value={wd?.current?.windGustKmh != null ? `${wd.current.windGustKmh.toFixed(0)} km/h` : '—'} />
              <DataRow label="Humedad" value={humidity != null ? `${humidity.toFixed(0)}%` : '—'} />
              <DataRow label="Presión" value={cd.extrapolation.pressureHPa != null ? `${cd.extrapolation.pressureHPa.toFixed(0)} hPa` : '—'} />
              <DataRow label="Radiación" value={cd.eto.inputs.solarRadiationWm2 != null ? `${cd.eto.inputs.solarRadiationWm2.toFixed(0)} W/m²` : '—'} />
              <DataRow label="ET0" value={cd.eto.etoHourlyMm != null ? `${cd.eto.etoHourlyMm.toFixed(1)} mm` : '—'} />
            </div>
          </section>

          <div className="text-center pb-4">
            <a href="/huescar/fuentes" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600">
              🔍 Fuentes y fiabilidad
            </a>
          </div>
        </main>
      </div>

      <NavBottom alertCount={alarms.length} />
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
