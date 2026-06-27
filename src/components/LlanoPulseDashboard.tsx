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
const FieldTab = dynamic(() => import('@/components/llano/field-tab').then((m) => ({ default: m.FieldTab })));
const AlertsTab = dynamic(() => import('@/components/llano/alerts-tab').then((m) => ({ default: m.AlertsTab })));
const DataTab = dynamic(() => import('@/components/llano/data-tab').then((m) => ({ default: m.DataTab })));
const LazySummaryPanel = dynamic(() => import('@/components/llano/pulse-summary-panel').then((m) => ({ default: m.SummaryPanel })), {
  ssr: false,
  loading: () => <div className="surface-card rounded-[28px] p-10 text-center text-slate-500">Cargando resumen...</div>,
});

type UiMode = 'essential' | 'practical' | 'technical';
const MODE_STORAGE_KEY = 'llano-pulse-mode';

function useModeState(): [UiMode, (mode: UiMode) => void] {
  const [mode, setMode] = useState<UiMode>('essential');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    if (stored === 'technical' || stored === 'practical' || stored === 'essential') {
      setMode(stored);
    } else if (stored === 'simple') {
      setMode('essential');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
      window.dispatchEvent(new CustomEvent('llano-pulse-mode-changed', { detail: mode }));
    }
  }, [mode, hydrated]);

  const effectiveMode = hydrated ? mode : 'essential';
  return [effectiveMode, setMode];
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
  const [mode, setMode] = useModeState();
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

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <LocalAlarmNotifier alarms={alarms} />
      <div className="mx-auto max-w-lg px-4 pt-4" style={mode === 'technical' ? { paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' } : { paddingBottom: '16px' }}>
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
              <h1 className="mt-0.5 text-xl font-black text-slate-900">Meteo Huéscar</h1>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/huescar/agricultura"
                className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
                aria-label="Ir a Meteo Huéscar Campo"
              >
                🌾 Campo
              </a>
              <ModeSwitcher mode={mode} onChange={setMode} />
            </div>
          </div>
        </header>

        {(mode === 'practical' || (mode === 'technical' && activeTab === 'now')) && (
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

        {wd?.lightning && (
          <div className="mb-3">
            <LightningPanel lightning={wd.lightning} />
          </div>
        )}

        <PwaRegister />

        <a href="/huescar/agricultura" className="mb-3 block">
          <div className="flex items-center justify-between gap-4 rounded-[22px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4 shadow-sm transition hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-100 p-2">
                <span className="text-xl">🌾</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700">Campo</p>
                <p className="text-sm font-black text-emerald-900">Meteo Huéscar Campo</p>
                <p className="text-xs text-emerald-600">Riego, fenología y alertas agrícolas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 text-lg">→</span>
            </div>
          </div>
        </a>

        <main>
          {mode === 'technical' ? (
            <TabContent
              activeTab={activeTab}
              climate={cd}
              weather={wd}
              forecast={forecast.data}
              alarms={alarms}
            />
          ) : (
            <LazySummaryPanel
              depth={mode}
              climate={cd}
              weather={wd}
              alarms={alarms}
              onShowPractical={() => setMode('practical')}
              onShowTechnical={() => setMode('technical')}
            />
          )}
        </main>
      </div>

      {mode === 'technical' && <NavBottom active={activeTab} onChange={setActiveTab} alertCount={alarms.length} />}
    </div>
  );
}

function ModeSwitcher({ mode, onChange }: { mode: UiMode; onChange: (mode: UiMode) => void }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
      <span className="pl-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Modo:</span>
      <button
        type="button"
        onClick={() => onChange('essential')}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${mode === 'essential' ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        Esencial
      </button>
      <button
        type="button"
        onClick={() => onChange('practical')}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${mode === 'practical' ? 'bg-emerald-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        Práctico
      </button>
      <button
        type="button"
        onClick={() => onChange('technical')}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${mode === 'technical' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        Técnico
      </button>
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
    case 'now':
      return <NowTab climate={climate} weather={weather} alarms={alarms} />;
    case 'hours':
      return <HoursTab hourly={weather?.hourly} forecast={forecast} daily={weather?.daily} weather={weather} />;
    case 'field':
      return (
        <FieldTab
          climate={climate}
          weather={weather}
          agricultural={weather?.agricultural ?? null}
          livestock={weather?.livestock ?? null}
          alarms={alarms}
        />
      );
    case 'alerts':
      return <AlertsTab alarms={alarms} />;
    case 'data':
      return <DataTab climate={climate} weather={weather} forecast={forecast} />;
  }
}
