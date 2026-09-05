'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWeatherData } from '@/hooks/useWeatherData';
import { fmtHourMadrid } from '@/lib/timezone';
import { HeroPanel } from '@/components/dashboard/hero-panel';
import { DailyCards, HourlyForecastDetails } from '@/components/dashboard/forecast-tables';
import { AgriculturalSection, LivestockSection } from '@/components/dashboard/operations-panels';
import { FrostPanel, ChillPanel, WaterBalancePanel } from '@/components/dashboard/agro-climatology-panels';
import { ClimateNormalsPanel } from '@/components/dashboard/climate-normals-panel';
import { RegionalPanel } from '@/components/dashboard/regional-panel';
import { DashboardDetail, TabSystem, type DashboardTab } from '@/components/dashboard/tabs';
import ModelTransparencyPanel from '@/components/ModelTransparencyPanel';
import NowcastPanel from '@/components/NowcastPanel';
import RadarPanel from '@/components/RadarPanel';
import WeatherStationPanel from '@/components/WeatherStationPanel';
import { RaifPanel } from '@/components/llano/RaifPanel';
import type { WeatherPayload } from '@/types/weather';

const TemperatureChart = dynamic(() => import('@/components/dashboard/temperature-chart').then(m => ({ default: m.TemperatureChart })), {
  loading: () => (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
    </div>
  ),
});

function LoadingState() {
  return (
    <div className="surface-card rounded-[28px] p-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600"><div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-sky-600" />Cargando previsión…</div>
      <div className="mt-5 space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-slate-100" /><div className="h-40 animate-pulse rounded-2xl bg-slate-100" /></div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="surface-card rounded-[28px] p-20 text-center">
      <p className="font-semibold text-rose-700">No se pudo cargar la previsión</p>
      <p className="mt-2 text-sm text-slate-500">Comprueba tu conexión o inténtalo de nuevo.</p>
      <button type="button" onClick={onRetry} className="mt-4 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800">Reintentar</button>
    </div>
  );
}

export default function WeatherDashboard({ initialData = null }: { initialData?: WeatherPayload | null }) {
  const { data, error, loading, isStale, cachedAt, refresh } = useWeatherData('meteo-dashboard', initialData);
  const [activeTab, setActiveTab] = useState<DashboardTab>('forecast');

  if (loading) return <LoadingState />;
  if (error && !data) return <ErrorState onRetry={refresh} />;
  if (!data) return null;

  const showNowcast = data.nowcast && data.nowcast.level !== 'ninguno';

  const forecastPanel = (
    <div
      className="space-y-5"
      role="tabpanel"
      id="dashboard-panel-forecast"
      aria-labelledby="dashboard-tab-forecast"
    >
      {showNowcast && <NowcastPanel nowcast={data.nowcast!} variant="neutral" />}
      <div className="rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm sm:rounded-[28px] sm:p-5">
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximas horas</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">Temperatura prevista</h3>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">Evolucion inmediata y referencia diaria.</p>
        </div>
        <TemperatureChart hourly={data.hourly} daily={data.daily} />
      </div>
      <DailyCards daily={data.daily} referenceTime={data.fetchedAt} />
      <HourlyForecastDetails hourly={data.hourly} referenceTime={data.fetchedAt} />
    </div>
  );

  const operationsPanel = (
    <div
      className="space-y-5"
      role="tabpanel"
      id="dashboard-panel-operations"
      aria-labelledby="dashboard-tab-operations"
    >
      <WeatherStationPanel />
      <FrostPanel daily={data.daily} referenceTime={data.fetchedAt} />
      <ChillPanel />
      <WaterBalancePanel />
      {data.agricultural && <AgriculturalSection agri={data.agricultural} />}
      {data.livestock && <LivestockSection livestock={data.livestock} />}
      <RaifPanel weather={data} />
    </div>
  );

  const technicalPanel = (
    <div
      className="space-y-4"
      role="tabpanel"
      id="dashboard-panel-technical"
      aria-labelledby="dashboard-tab-technical"
    >
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Datos abiertos</p>
        <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">📥 Exportar datos</h3>
        <p className="mt-2 text-sm text-slate-600">Descarga los datos meteorologicos en formato CSV.</p>
        <div className="mt-3 flex flex-col gap-2.5 sm:mt-4 sm:flex-row sm:flex-wrap sm:gap-3">
          <a href="/api/weather/export?format=full" className="rounded-full bg-sky-700 px-4 py-2 text-center text-xs font-semibold text-white transition hover:bg-sky-800 sm:text-sm">📊 CSV completo</a>
          <a href="/api/weather/export?format=hourly" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm">⏱️ CSV horario</a>
          <a href="/api/weather/export?format=daily" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm">📅 CSV diario</a>
        </div>
      </div>
      <ClimateNormalsPanel />
      <RegionalPanel />
      <DashboardDetail eyebrow="Detalle tecnico" title="Transparencia del modelo">
        <ModelTransparencyPanel data={data} />
      </DashboardDetail>
      <DashboardDetail eyebrow="Detalle tecnico" title="Radar regional">
        <RadarPanel radar={data.radar} />
      </DashboardDetail>
    </div>
  );

  return (
    <div className="surface-card-strong overflow-hidden rounded-[20px] border border-slate-200 p-3 sm:rounded-[32px] sm:p-6">
      {(isStale || error) && <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status"><span>{error ? 'No se han podido actualizar los datos. Mostrando la última información disponible.' : 'Actualizando datos…'}</span><button type="button" onClick={refresh} className="font-bold underline">Reintentar</button></div>}
      <p className="mb-3 text-right text-[11px] text-slate-500" suppressHydrationWarning>Última actualización: {fmtHourMadrid(cachedAt ? new Date(cachedAt).toISOString() : data.fetchedAt)}</p>
      <HeroPanel data={data} />
      <TabSystem
        activeTab={activeTab}
        onChange={setActiveTab}
        panels={{ forecast: forecastPanel, operations: operationsPanel, technical: technicalPanel }}
      />
    </div>
  );
}
