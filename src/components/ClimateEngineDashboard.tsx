'use client';

import { useState, type ReactNode } from 'react';
import { useClimateCalibration } from '@/hooks/useClimateCalibration';
import { useWeatherData } from '@/hooks/useWeatherData';
import { dayLabel } from '@/lib/display';
import { AuditHero, ContrastPanel } from '@/components/motor/contrast-panel';
import { QualityBanner } from '@/components/motor/quality-banner';
import { EquationsBox } from '@/components/motor/equations';
import { RiaFusionPanel } from '@/components/motor/ria-fusion';
import { MicroclimateStrip } from '@/components/motor/microclimate-strip';
import { ExtrapolationPanel } from '@/components/motor/extrapolation-panel';
import { EtoBreakdown } from '@/components/motor/eto-breakdown';
import { ExoticBlock } from '@/components/motor/exotic-block';

type MotorTab = 'resumen' | 'interpolacion' | 'fusion' | 'auditoria';

const tabLabels: Record<MotorTab, string> = {
  resumen: 'Resumen',
  interpolacion: 'Interpolación',
  fusion: 'Fusión RIA',
  auditoria: 'Auditoría',
};

function TabButton({ tab, active, onClick }: { tab: MotorTab; active: MotorTab; onClick: (t: MotorTab) => void }) {
  const isActive = active === tab;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`motor-panel-${tab}`}
      id={`motor-tab-${tab}`}
      className="dashboard-tab"
      data-active={String(isActive)}
      onClick={() => onClick(tab)}
    >
      {tabLabels[tab]}
    </button>
  );
}

function TabSystem({ active, onChange, panels }: {
  active: MotorTab;
  onChange: (t: MotorTab) => void;
  panels: Record<MotorTab, ReactNode>;
}) {
  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2 rounded-full bg-slate-100 p-2" role="tablist" aria-label="Secciones del motor climático">
        {(['resumen', 'interpolacion', 'fusion', 'auditoria'] as MotorTab[]).map((t) => (
          <TabButton key={t} tab={t} active={active} onClick={onChange} />
        ))}
      </div>
      <div className="mt-6">{panels[active]}</div>
    </>
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
      <p className="font-semibold text-red-500">No se pudo cargar el motor climático</p>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export default function ClimateEngineDashboard() {
  const { data, loading, error } = useClimateCalibration('climate-engine');
  const weather = useWeatherData('climate-engine-weather');
  const [activeTab, setActiveTab] = useState<MotorTab>('resumen');

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Sin datos del motor'} />;

  const weatherDegraded = weather.error && weather.data;

  const agri = weather.data?.agricultural;
  const daily = weather.data?.daily;

  const rainNext5d = daily ? daily.precipitationSumMm.slice(0, 5).reduce((s, v) => s + v, 0) : null;
  let maxRainDay: number | null = null;
  let maxRainDayLabel: string | null = null;
  if (daily) {
    const slice = daily.precipitationSumMm.slice(0, 5);
    const idxMax = slice.indexOf(Math.max(...slice));
    if (idxMax >= 0) {
      maxRainDay = slice[idxMax];
      maxRainDayLabel = dayLabel(daily.time[idxMax]);
    }
  }

  const foehnFactor = data.microclimate.rainfallFoehnFactor;
  const airTempC = data.calibration.realTemperatureC ?? data.interpolation.estimatedTemperatureC;

  const resumenPanel = (
    <div
      className="space-y-6"
      role="tabpanel"
      id="motor-panel-resumen"
      aria-labelledby="motor-tab-resumen"
    >
      <QualityBanner
        confidencePct={data.quality.confidencePct}
        warnings={data.quality.warnings}
        generatedAt={data.generatedAt}
      />
      <ContrastPanel data={data} />
      <MicroclimateStrip data={data} />
    </div>
  );

  const interpolacionPanel = (
    <div
      className="space-y-6"
      role="tabpanel"
      id="motor-panel-interpolacion"
      aria-labelledby="motor-tab-interpolacion"
    >
      <EquationsBox data={data} />
      <ExtrapolationPanel data={data} />
    </div>
  );

  const fusionPanel = (
    <div
      className="space-y-6"
      role="tabpanel"
      id="motor-panel-fusion"
      aria-labelledby="motor-tab-fusion"
    >
      <RiaFusionPanel rw={data.nodes.radiationWind} />
      <EtoBreakdown data={data} dewPointC={data.dewPoint.dewPointC} />
    </div>
  );

  const auditoriaPanel = (
    <div
      className="space-y-6"
      role="tabpanel"
      id="motor-panel-auditoria"
      aria-labelledby="motor-tab-auditoria"
    >
      <ExoticBlock data={data} airTempC={airTempC} />
    </div>
  );

  return (
    <div className="space-y-6">
      {weatherDegraded && (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-bold">Datos meteorológicos degradados.</span> No se pudieron obtener datos actualizados de Open-Meteo / AEMET. Algunas métricas agronómicas pueden no estar disponibles.
        </div>
      )}
      <AuditHero
        data={data}
        chillHours={agri?.chillHours ?? null}
        chillHoursYearly={agri?.yearlyChillHoursAccumulated ?? null}
        rainNext5d={rainNext5d}
        foehnFactor={foehnFactor}
      />
      <TabSystem
        active={activeTab}
        onChange={setActiveTab}
        panels={{
          resumen: resumenPanel,
          interpolacion: interpolacionPanel,
          fusion: fusionPanel,
          auditoria: auditoriaPanel,
        }}
      />
      {maxRainDay !== null && maxRainDayLabel && (
        <p className="text-center text-xs text-slate-400">
          Pico de lluvia previsto: {maxRainDay.toFixed(1)} mm {maxRainDayLabel}
        </p>
      )}
    </div>
  );
}
