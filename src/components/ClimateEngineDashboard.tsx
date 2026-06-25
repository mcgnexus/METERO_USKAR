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
import { KpiCard, fmtNumber, ConfidenceBar } from '@/components/motor/atoms';
import { OfflineBanner } from '@/components/OfflineBanner';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';

type MotorTab = 'resumen' | 'tecnica' | 'detalle';

const tabConfig: Record<MotorTab, { label: string; icon: string; hint: string }> = {
  resumen: { label: 'Resumen', icon: '📋', hint: 'Qué hace el motor y si puedes fiarte' },
  tecnica: { label: 'Método', icon: '🔬', hint: 'Las 4 capas del modelo y sus ecuaciones' },
  detalle: { label: 'Datos', icon: '📊', hint: 'Todos los valores crudos y las fuentes' },
};

function TabButton({ tab, active, onClick }: { tab: MotorTab; active: MotorTab; onClick: (t: MotorTab) => void }) {
  const isActive = active === tab;
  const cfg = tabConfig[tab];
  return (
        <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`motor-panel-${tab}`}
      id={`motor-tab-${tab}`}
      className={`flex-1 rounded-xl px-3 py-2.5 text-center transition ${
        isActive
          ? 'bg-sky-700 text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
      onClick={() => onClick(tab)}
        >
      <span className="block text-base">{cfg.icon}</span>
      <span className="block text-xs font-bold">{cfg.label}</span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-slate-200 bg-white p-12">
      <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-500" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-10 text-center">
      <p className="font-semibold text-red-500">No se pudo cargar el motor climático</p>
      <p className="mt-2 text-sm text-slate-700">{message}</p>
    </div>
  );
}

function ResumenPanel({ data, agri, daily }: {
  data: ClimateCalibrationPayload;
  agri: WeatherPayload['agricultural'] | null;
  daily: WeatherPayload['daily'] | null;
}) {
  const temp = data.calibration.realTemperatureC ?? data.interpolation.estimatedTemperatureC;
  const residual = data.calibration.residualC;
  const residualOk = residual === null || Math.abs(residual) < 1;
  const inversion = data.interpolation.inversionDetected;
  const rainNext5d = daily ? daily.precipitationSumMm.slice(0, 5).reduce((s, v) => s + v, 0) : null;

  return (
    <div className="space-y-4" role="tabpanel" id="motor-panel-resumen" aria-labelledby="motor-tab-resumen">
      <QualityBanner
        confidencePct={data.quality.confidencePct}
        warnings={data.quality.warnings}
        generatedAt={data.generatedAt}
      />

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Qué hace este motor</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Huéscar no tiene estación meteorológica oficial propia. Este motor estima la temperatura,
          humedad, presión y viento reales del llano (950 m) combinando datos de AEMET Baza, AEMET San Clemente,
          las estaciones agrícolas RIA y un sensor local cuando está disponible.
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Aplica 4 capas: gradiente térmico, transporte de humedad, demanda evaporativa (ETo) y corrección
          de microclima (drenaje de aire frío + isla de calor urbana). El resultado se audita contra el sensor propio.
        </p>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Salida actual</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <KpiCard label="Temperatura" value={fmtNumber(temp, 1)} unit="°C" tone="accent"
            caption={data.calibration.realTemperatureC !== null ? 'Sensor propio (auditado)' : 'Estimación por gradiente'} />
          <KpiCard label="Humedad" value={fmtNumber(data.extrapolation.humidityPct, 0)} unit="%" tone="accent"
            caption="Transportada desde Baza con Tetens-Magnus" />
          <KpiCard label="ETo horaria" value={fmtNumber(data.eto.etoHourlyMm, 3)} unit="mm"
            caption="Demanda evaporativa (FAO-56 PM)" />
          <KpiCard label="Presión" value={fmtNumber(data.extrapolation.pressureHPa, 0)} unit="hPa"
            caption="Barométrica hipsométrica desde Baza" />
        </div>
      </section>

      <section className={`rounded-[24px] border p-5 ${
        residualOk ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'
      }`}>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Fiabilidad</h2>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-lg font-black text-slate-900">
              {residual === null
                ? 'Sin sensor local para auditar'
                : residualOk
                ? 'Modelo preciso'
                : 'Modelo con desviación'}
            </p>
            <p className="text-sm text-slate-600">
              {residual === null
                ? 'El resultado se basa solo en interpolación física.'
                : `Residual ${residual > 0 ? '+' : ''}${residual.toFixed(2)}°C vs sensor propio.`}
            </p>
          </div>
          <div className="w-full sm:w-48">
            <ConfidenceBar pct={data.quality.confidencePct} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {inversion && (
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800">
              Inversión térmica detectada
            </span>
          )}
          {data.microclimate.inversionConditions && (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
              Drenaje catabático activo
            </span>
          )}
          {data.dewPoint.frostRisk !== 'none' && data.dewPoint.frostRisk !== 'unknown' && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
              Riesgo helada: {data.dewPoint.frostRisk}
            </span>
          )}
          {rainNext5d !== null && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              Lluvia 5d: {rainNext5d.toFixed(1)} mm
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function TecnicaPanel({ data, dewPointC }: { data: ClimateCalibrationPayload; dewPointC: number | null }) {
  return (
    <div className="space-y-4" role="tabpanel" id="motor-panel-tecnica" aria-labelledby="motor-tab-tecnica">
      <section className="rounded-[24px] border border-slate-200 bg-white p-5">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Metodología</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          El motor aplica una cascada de leyes físicas en orden: decide la estabilidad de la columna de aire,
          transporta la humedad, calcula la demanda evaporativa y aplica correcciones de microclima del llano.
          Cada capa alimenta la siguiente.
        </p>
      </section>
      <EquationsBox data={data} />
      <ExtrapolationPanel data={data} />
      <RiaFusionPanel rw={data.nodes.radiationWind} />
      <EtoBreakdown data={data} dewPointC={dewPointC} />
    </div>
  );
}

function DetallePanel({ data, airTempC }: { data: ClimateCalibrationPayload; airTempC: number | null }) {
  return (
    <div className="space-y-4" role="tabpanel" id="motor-panel-detalle" aria-labelledby="motor-tab-detalle">
      <ContrastPanel data={data} />
      <MicroclimateStrip data={data} />
      <ExoticBlock data={data} airTempC={airTempC} />
    </div>
  );
}

export default function ClimateEngineDashboard({
  initialClimateData = null,
  initialWeatherData = null,
}: {
  initialClimateData?: ClimateCalibrationPayload | null;
  initialWeatherData?: WeatherPayload | null;
}) {
  const { data, loading, error } = useClimateCalibration('climate-engine', initialClimateData);
  const weather = useWeatherData('climate-engine-weather', initialWeatherData);
  const [activeTab, setActiveTab] = useState<MotorTab>('resumen');

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Sin datos del motor'} />;

  const agri = weather.data?.agricultural ?? null;
  const daily = weather.data?.daily ?? null;
  const airTempC = data.calibration.realTemperatureC ?? data.interpolation.estimatedTemperatureC;
  const dewPointC = data.dewPoint.dewPointC;

  return (
    <div className="space-y-4">
      {(data && (weather.isStale)) && (
        <OfflineBanner isStale cachedAt={weather.cachedAt} />
      )}

      {weather.error && weather.data && (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <span className="font-bold">Datos meteorológicos degradados.</span> No se pudieron obtener datos actualizados de Open-Meteo / AEMET.
        </div>
      )}

      <AuditHero
        data={data}
        chillHours={agri?.chillHours ?? null}
        chillHoursYearly={agri?.yearlyChillHoursAccumulated ?? null}
        rainNext5d={daily ? daily.precipitationSumMm.slice(0, 5).reduce((s, v) => s + v, 0) : null}
        foehnFactor={data.microclimate.rainfallFoehnFactor}
      />

      <div className="flex gap-1.5 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Niveles del motor climático">
        {(['resumen', 'tecnica', 'detalle'] as MotorTab[]).map((t) => (
          <TabButton key={t} tab={t} active={activeTab} onClick={setActiveTab} />
        ))}
      </div>

      <p className="text-center text-xs text-slate-700">{tabConfig[activeTab].hint}</p>

      {activeTab === 'resumen' && <ResumenPanel data={data} agri={agri} daily={daily} />}
      {activeTab === 'tecnica' && <TecnicaPanel data={data} dewPointC={dewPointC} />}
      {activeTab === 'detalle' && <DetallePanel data={data} airTempC={airTempC} />}
    </div>
  );
}
