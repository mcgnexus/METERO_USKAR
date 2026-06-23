'use client';

import { useState } from 'react';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useWeatherData } from '@/hooks/useWeatherData';
import { useForecast } from '@/hooks/useForecast';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { NavBottom, type TabId } from '@/components/NavBottom';
import { NowTab } from '@/components/llano/now-tab';
import { HoursTab } from '@/components/llano/hours-tab';
import { FieldTab } from '@/components/llano/field-tab';
import { AlertsTab } from '@/components/llano/alerts-tab';
import { DataTab } from '@/components/llano/data-tab';
import { OfflineBanner } from '@/components/OfflineBanner';
import { NotificationPermission } from '@/components/NotificationPermission';
import { LocalAlarmNotifier } from '@/components/LocalAlarmNotifier';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';

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
  const [activeTab, setActiveTab] = useState<TabId>('now');
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

  const renderTab = () => {
    switch (activeTab) {
      case 'now':
        return <NowTab climate={cd} weather={wd} alarms={alarms} />;
      case 'hours':
        return <HoursTab hourly={wd?.hourly} forecast={forecast.data} daily={wd?.daily} weather={wd} />;
      case 'field':
        return (
          <FieldTab
            climate={cd}
            weather={wd}
            agricultural={wd?.agricultural ?? null}
            livestock={wd?.livestock ?? null}
          />
        );
      case 'alerts':
        return <AlertsTab alarms={alarms} />;
      case 'data':
        return <DataTab climate={cd} weather={wd} forecast={forecast.data} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <LocalAlarmNotifier alarms={alarms} />
      <div className="mx-auto max-w-lg px-4 pt-4 pb-4">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
              <h1 className="mt-0.5 text-xl font-black text-slate-900">Huéscar</h1>
            </div>
            <div />
          </div>
        </header>

        {activeTab === 'now' && (
          <div className="mb-3">
            <NotificationPermission />
          </div>
        )}

        {(climate.isStale || weather.isStale) && (
          <div className="mb-3">
            <OfflineBanner
              isStale
              cachedAt={climate.cachedAt ?? weather.cachedAt}
            />
          </div>
        )}

        <main>
          {renderTab()}
        </main>
      </div>

      <NavBottom active={activeTab} onChange={setActiveTab} alertCount={alarms.length} />
    </div>
  );
}
