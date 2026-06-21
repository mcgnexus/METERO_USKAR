'use client';

import { useState } from 'react';
import { useWeatherData } from '@/hooks/useWeatherData';
import { HeroPanel } from '@/components/dashboard/hero-panel';
import { DailyCards, HourlyForecastDetails } from '@/components/dashboard/forecast-tables';
import { TemperatureChart } from '@/components/dashboard/temperature-chart';
import { AgriculturalSection, LightningPanel, LivestockSection } from '@/components/dashboard/operations-panels';
import { DashboardDetail, TabSystem, type DashboardTab } from '@/components/dashboard/tabs';
import ModelTransparencyPanel from '@/components/ModelTransparencyPanel';
import NowcastPanel from '@/components/NowcastPanel';
import RadarPanel from '@/components/RadarPanel';
import WeatherStationPanel from '@/components/WeatherStationPanel';

function LoadingState() {
  return (
    <div className="surface-card flex items-center justify-center rounded-[28px] p-20">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-500" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="surface-card rounded-[28px] p-20 text-center">
      <p className="font-semibold text-red-500">Error al cargar datos</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function WeatherDashboard() {
  const { data, error, loading } = useWeatherData('meteo-dashboard');
  const [activeTab, setActiveTab] = useState<DashboardTab>('forecast');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;
  if (!data) return null;

  const showNowcast = data.nowcast && (data.nowcast.level !== 'ninguno' || data.nowcast.stormDetected);

  const forecastPanel = (
    <div
      className="space-y-5"
      role="tabpanel"
      id="dashboard-panel-forecast"
      aria-labelledby="dashboard-tab-forecast"
    >
      {showNowcast && <NowcastPanel nowcast={data.nowcast!} variant="neutral" />}
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximas horas</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Temperatura prevista</h3>
          </div>
          <p className="text-sm text-slate-500">Evolucion inmediata y referencia diaria.</p>
        </div>
        <TemperatureChart hourly={data.hourly} daily={data.daily} />
      </div>
      <DailyCards daily={data.daily} />
      <HourlyForecastDetails hourly={data.hourly} />
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
      {data.agricultural && <AgriculturalSection agri={data.agricultural} />}
      {data.livestock && <LivestockSection livestock={data.livestock} />}
      {data.lightning && data.lightning.active && <LightningPanel lightning={data.lightning} />}
    </div>
  );

  const technicalPanel = (
    <div
      className="space-y-4"
      role="tabpanel"
      id="dashboard-panel-technical"
      aria-labelledby="dashboard-tab-technical"
    >
      <DashboardDetail eyebrow="Detalle tecnico" title="Transparencia del modelo">
        <ModelTransparencyPanel data={data} />
      </DashboardDetail>
      <DashboardDetail eyebrow="Detalle tecnico" title="Radar regional">
        <RadarPanel radar={data.radar} />
      </DashboardDetail>
    </div>
  );

  return (
    <div className="surface-card-strong overflow-hidden rounded-[32px] border border-slate-200 p-4 sm:p-6">
      <HeroPanel data={data} />
      <TabSystem
        activeTab={activeTab}
        onChange={setActiveTab}
        panels={{ forecast: forecastPanel, operations: operationsPanel, technical: technicalPanel }}
      />
    </div>
  );
}
