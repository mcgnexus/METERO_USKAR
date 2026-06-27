'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { NavBottom, type TabId } from '@/components/NavBottom';
import { OfflineBanner } from '@/components/OfflineBanner';
import { NotificationPermission } from '@/components/NotificationPermission';
import { LocalAlarmNotifier } from '@/components/LocalAlarmNotifier';
import { LightningPanel } from '@/components/llano/lightning-panel';
import PwaRegister from '@/components/PwaRegister';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';
const NowTab = dynamic(() => import('@/components/llano/now-tab').then((m) => ({ default: m.NowTab })));
const HoursTab = dynamic(() => import('@/components/llano/hours-tab').then((m) => ({ default: m.HoursTab })));
const WeekTab = dynamic(() => import('@/components/llano/week-tab').then((m) => ({ default: m.WeekTab })));
const FieldTab = dynamic(() => import('@/components/llano/field-tab').then((m) => ({ default: m.FieldTab })));
const AlertsTab = dynamic(() => import('@/components/llano/alerts-tab').then((m) => ({ default: m.AlertsTab })));

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
      <p className="font-semibold text-red-500">❌ No se pudo cargar la página de Huéscar</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function LlanoPulseDashboard({
  initialClimateData = null,
  initialWeatherData = null,
  initialForecastData = null,
}: {
  initialClimateData?: ClimateCalibrationPayload | null;
  initialWeatherData?: WeatherPayload | null;
  initialForecastData?: ForecastPayload | null;
}) {
  const [activeTab, setActiveTab] = useState<TabId>('hoy');
  const climate = useClimateCalibration('llano-pulse-climate', initialClimateData);
  const weather = useWeatherData('llano-pulse-weather', initialWeatherData);
  const forecast = useForecast(5, 'llano-pulse-forecast', initialForecastData);

  if (climate.loading || weather.loading) {
    return <LoadingState />;
  }

  if ((climate.error && !climate.data) || (!climate.data && !climate.isStale)) {
    return <ErrorState message={climate.error?.message ?? 'Sin datos del motor climático'} />;
  }

  const cd = climate.data!;
  const wd = weather.data;

  const alarms = buildAlarms(cd, {
    daily: wd?.daily,
    weather: wd,
    agricultural: wd?.agricultural,
  });

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

        {(activeTab === 'hoy') && (
          <div className="mb-3 min-h-[92px]">
            <NotificationPermission />
          </div>
        )}

        {(climate.isStale || weather.isStale) && (
          <div className="mb-3 min-h-[56px]">
            <OfflineBanner
              isStale
              cachedAt={climate.cachedAt ?? weather.cachedAt}
            />
          </div>
        )}

        {wd?.lightning && activeTab === 'hoy' && (
          <div className="mb-3">
            <LightningPanel lightning={wd.lightning} />
          </div>
        )}

        <PwaRegister />

        <main>
          <TabContent
            activeTab={activeTab}
            climate={cd}
            weather={wd}
            forecast={forecast.data}
            alarms={alarms}
          />
        </main>
      </div>

      <NavBottom alertCount={alarms.length} />
    </div>
  );
}

function TabContent({
  activeTab,
  climate,
  weather,
  forecast,
  alarms,
}: {
  activeTab: TabId;
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  forecast: ForecastPayload | null;
  alarms: ReturnType<typeof buildAlarms>;
}) {
  switch (activeTab) {
    case 'hoy':
      return <NowTab climate={climate} weather={weather} alarms={alarms} />;
    case 'horas':
      return <HoursTab hourly={weather?.hourly} forecast={forecast} daily={weather?.daily} weather={weather} />;
    case 'semana':
      return <WeekTab daily={weather?.daily ?? null} forecast={forecast} />;
    case 'campo':
      return (
        <FieldTab
          climate={climate}
          weather={weather}
          agricultural={weather?.agricultural ?? null}
          livestock={weather?.livestock ?? null}
          alarms={alarms}
        />
      );
    case 'alertas':
      return <AlertsTab alarms={alarms} />;
  }
}
