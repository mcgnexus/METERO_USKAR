'use client';

import { useState } from 'react';
import { fmtN } from '@/components/llano/atoms';
import { IndicatorHelp, type IndicatorKey } from '@/components/llano/indicator-help';
import { ZoneSection } from '@/components/llano/zone-section';
import TemperatureChart from '@/components/visualizacion/TemperatureChart';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';

export function DataTab({ climate, weather, forecast }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  forecast: ForecastPayload | null;
}) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const toggle = (section: string) => setExpandedSection(expandedSection === section ? null : section);

  const ex = climate.exoticVariables;
  const rw = climate.nodes.radiationWind;
  const hum = climate.nodes.localStation?.humidityPct ?? climate.eto.inputs.humidityPct;
  const confidence = climate.quality?.confidencePct ?? null;
  const confidenceBreakdown = climate.quality?.breakdown ?? null;
  const confidenceText = confidence != null
    ? confidence >= 80
      ? 'Alta: dato fiable para orientacion general y decisiones de campo.'
      : confidence >= 60
      ? 'Media: dato util para orientacion general. Revisa avisos oficiales.'
      : 'Baja: verificar con fuentes oficiales antes de decisiones importantes.'
    : 'No disponible';
  const aemetHealth = weather?.sourceHealth?.find(s => s.source === 'AEMET') ?? null;
  const openMeteoHealth = weather?.sourceHealth?.find(s => s.source === 'OPEN_METEO') ?? null;
  const localHealth = weather?.sourceHealth?.find(s => s.source === 'LOCAL_STATIONS') ?? null;
  const sanClemente = climate.nodes.sanClemente;

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-700">Centro técnico</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Esta sección es para usuarios avanzados. Aquí puedes ver fuentes, sesgos, microclimas y datos agronómicos completos.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${!showAll ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Ver solo datos básicos
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${showAll ? 'bg-slate-950 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Ver todos los datos
          </button>
        </div>
      </section>

      <Section title="Temperatura" expanded={expandedSection === 'temp'} onToggle={() => toggle('temp')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Real (calibrada)" value={fmtN(climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC, 1) + 'C'} />
          <Metric label="Estimacion interpolacion" value={fmtN(climate.interpolation.estimatedTemperatureC, 1) + 'C'} />
          <Metric label="Baza (fuente)" value={fmtN(climate.extrapolation.rawTemperatureC, 1) + 'C'} />
          <Metric label="AEMET Baza" value={climate.nodes.baza ? fmtN(climate.nodes.baza.temperatureC, 1) + 'C' : 'No disponible'} />
          <Metric label="AEMET San Clemente" value={climate.nodes.sanClemente ? fmtN(climate.nodes.sanClemente.temperatureC, 1) + 'C' : 'No disponible'} />
          <Metric label="Mini estacion local" value={climate.nodes.localStation ? fmtN(climate.nodes.localStation.temperatureC, 1) + 'C' : 'Sin lectura'} />
          <Metric label="Gradiente altitudinal" value={climate.interpolation.dynamicGradientCPer100m ? climate.interpolation.dynamicGradientCPer100m.toFixed(2) + 'C/100m' : 'No calculado'} />
        </div>
      </Section>

      <Section title="Humedad y punto de rocio" expanded={expandedSection === 'humidity'} onToggle={() => toggle('humidity')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Humedad relativa" value={hum != null ? hum.toFixed(0) + '%' : '--'} />
          <Metric label="Punto de rocio" value={fmtN(climate.dewPoint.dewPointC, 1) + 'C'} />
          <Metric label="VPD" value={ex.vapourPressureDeficitKPa != null ? ex.vapourPressureDeficitKPa.toFixed(2) + ' kPa' : '--'} />
          <Metric label="HR (inputs ETo)" value={fmtN(climate.eto.inputs.humidityPct, 0) + '%'} />
        </div>
      </Section>

      <Section title="Viento" expanded={expandedSection === 'wind'} onToggle={() => toggle('wind')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Velocidad 2m" value={rw.windSpeed2mKmh.toFixed(1) + ' km/h'} />
          <Metric label="Direccion Baza" value={climate.extrapolation.bazaWindDirectionDeg != null ? climate.extrapolation.bazaWindDirectionDeg.toFixed(0) + ' deg' : '--'} />
          <Metric label="Factor reduccion rafagas" value={climate.microclimate.windGustReductionFactor.toFixed(2)} />
        </div>
      </Section>

      <Section title="Suelo" expanded={expandedSection === 'soil'} onToggle={() => toggle('soil')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Temperatura 10cm" value={fmtN(ex.soilTemp10cmC, 1) + 'C'} />
          <Metric label="Temperatura 40cm" value={fmtN(ex.soilTemp40cmC, 1) + 'C'} />
        </div>
      </Section>

      {showAll && (
        <>
          <Section title="Radiacion y energia" expanded={expandedSection === 'radiation'} onToggle={() => toggle('radiation')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Radiacion solar" value={rw.solarRadiationWm2.toFixed(0) + ' W/m2'} />
              <Metric label="ET0 horaria" value={fmtN(climate.eto.etoHourlyMm, 3) + ' mm'} />
              <Metric label="ET0 diaria" value={rw.et0DailyMm != null ? rw.et0DailyMm.toFixed(2) + ' mm' : '--'} />
              <Metric label="Cobertura nubes" value={ex.cloudCoverPct != null ? ex.cloudCoverPct.toFixed(0) + '%' : '--'} />
              <Metric label="Indice UV" value={ex.uvIndex != null ? ex.uvIndex.toFixed(1) : '--'} />
              <Metric label="Visibilidad" value={ex.visibilityM != null ? (ex.visibilityM / 1000).toFixed(1) + ' km' : '--'} />
            </div>
          </Section>

          <Section title="Microclima y correcciones" expanded={expandedSection === 'microclimate'} onToggle={() => toggle('microclimate')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Drenaje aire frio" value={fmtN(climate.microclimate.coldAirDrainageC, 2) + 'C'} />
              <Metric label="Inversion termica" value={climate.microclimate.inversionConditions ? 'Si' : 'No'} />
              <Metric label="Isla calor urbana" value={fmtN(climate.microclimate.urbanHeatIslandC, 2) + 'C'} />
              <Metric label="CAPE (inestabilidad)" value={ex.capeJkg != null ? ex.capeJkg.toFixed(0) + ' J/kg' : '--'} />
              <Metric label="Factor orografico" value={weather?.orographic?.factor != null ? weather.orographic.factor.toFixed(2) : '--'} />
              <Metric label="Clasificacion" value={weather?.orographic?.classification ?? '--'} />
            </div>
          </Section>

          <Section title="Microclimas por zona" expanded={expandedSection === 'zones'} onToggle={() => toggle('zones')}>
            <ZoneSection />
          </Section>

          <Section title="Grafica de temperatura" expanded={expandedSection === 'chart'} onToggle={() => toggle('chart')}>
            {weather ? (
              <TemperatureChart currentData={weather} />
            ) : (
              <p className="text-sm text-slate-700">Datos no disponibles</p>
            )}
          </Section>

          <Section title="Fuentes de confianza" expanded={expandedSection === 'confidence'} onToggle={() => toggle('confidence')}>
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Confianza del dato<IndicatorHelp term="confidence" /></div>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{confidenceText}</p>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-right text-white">
                    <p className="text-2xl font-black leading-none">{confidence != null ? confidence.toFixed(0) : '--'}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">%</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-sky-600"
                    style={{ width: `${Math.max(0, Math.min(100, confidence ?? 0))}%` }}
                  />
                </div>
                {confidenceBreakdown && (
                  <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <ConfidencePenalty label="Base del modelo" value={`+${confidenceBreakdown.basePct}%`} />
                    <ConfidencePenalty label="Fuentes/fallbacks" value={`-${confidenceBreakdown.missingPenalty}%`} />
                    <ConfidencePenalty label="Estacion local" value={`-${confidenceBreakdown.localStationPenalty}%`} />
                    <ConfidencePenalty label="Antiguedad datos" value={`-${confidenceBreakdown.agePenalty}%`} />
                  </div>
                )}
                {confidenceBreakdown?.structuralWarnings?.length ? (
                  <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
                    <p className="font-bold">Por que baja la confianza</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {confidenceBreakdown.structuralWarnings.slice(0, 4).map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3">
                <SourceCard title="AEMET Baza" subtitle="Referencia oficial cercana" status={aemetHealth?.status} message={aemetHealth?.message} />
                <SourceCard
                  title="AEMET San Clemente"
                  subtitle="Estacion oficial de Huéscar 5051X"
                  status={sanClemente?.status === 'OK' ? 'OK' : sanClemente?.status === 'FALLBACK' ? 'DEGRADED' : 'ERROR'}
                  message={sanClemente?.temperatureC != null ? `${fmtN(sanClemente.temperatureC, 1)}C · ${sanClemente.elevationM.toFixed(0)} m` : 'Sin lectura directa'}
                />
                <SourceCard title="Open-Meteo" subtitle="Modelo horario de apoyo" status={openMeteoHealth?.status} message={openMeteoHealth?.message} />
                <SourceCard title="Sensor propio llano" subtitle="Calibracion fina si esta activo" status={localHealth?.status} message={localHealth?.message} />
              </div>
            </div>
          </Section>

          {forecast?.biasCorrection && (
            <Section title="Correccion de sesgo" expanded={expandedSection === 'bias'} onToggle={() => toggle('bias')}>
              <div className="grid gap-3 sm:grid-cols-4">
                <Metric label="Sesgo T total" value={forecast.biasCorrection.temperature.all.toFixed(2) + 'C'} />
                <Metric label="Sesgo T dia" value={forecast.biasCorrection.temperature.day.toFixed(2) + 'C'} />
                <Metric label="Sesgo T noche" value={forecast.biasCorrection.temperature.night.toFixed(2) + 'C'} />
                <Metric label="Sesgo HR" value={forecast.biasCorrection.humidity.toFixed(1) + '%'} />
                <Metric label="Sesgo viento" value={forecast.biasCorrection.wind.toFixed(1) + ' km/h'} />
                <Metric label="Muestras" value={String(forecast.biasCorrection.sampleCount)} />
              </div>
            </Section>
          )}

          {weather?.agricultural && (
            <Section title="Datos agronomicos" expanded={expandedSection === 'agro'} onToggle={() => toggle('agro')}>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="ET0 acumulada 7d" value={fmtN(weather.agricultural.et0CumulativeMm, 1) + ' mm'} />
                <Metric label="GDD acumulados" value={fmtN(weather.agricultural.gddCumulative, 0)} />
                <Metric label="Horas-frio" value={fmtN(weather.agricultural.chillHours, 0) + ' h'} />
                <Metric label="Riesgo helada 48h" value={weather.agricultural.frostRisk48h} />
                <Metric label="Riego recomendado" value={weather.agricultural.recommendedIrrigationLitersM2 != null ?
                  weather.agricultural.recommendedIrrigationLitersM2.toFixed(1) + ' L/m2' : '--'} />
                <Metric label="Suelo operable" value={weather.agricultural.workability.workable ? 'Si' : 'No'} />
              </div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, expanded, onToggle, children }: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <span className={'text-slate-600 transition-transform ' + (expanded ? 'rotate-180' : '')}>&#9662;</span>
      </button>
      {expanded && <div className="border-t border-slate-100 px-5 py-4">{children}</div>}
    </section>
  );
}

function helpForMetric(label: string): IndicatorKey | undefined {
  const lower = label.toLowerCase();
  if (lower.includes('vpd')) return 'vpd';
  if (lower.includes('cape')) return 'cape';
  if (lower.includes('sesgo')) return 'bias';
  if (lower.includes('riego')) return 'litersM2';
  if (lower.includes('gdd')) return 'gdd';
  if (lower.includes('horas-frio') || lower.includes('horas-frío')) return 'chillHours';
  if (lower.includes('helada')) return 'frostRisk';
  if (lower.includes('inversion') || lower.includes('inversión')) return 'inversion';
  if (lower.includes('orografico') || lower.includes('orográfico')) return 'orographic';
  return undefined;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">{label}<IndicatorHelp term={helpForMetric(label)} /></div>
      <p className="mt-1 text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function ConfidencePenalty({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span>{label}</span>
      <span className="font-black text-slate-900">{value}</span>
    </div>
  );
}

function sourceStatusTone(status?: string): string {
  if (status === 'OK') return 'bg-emerald-100 text-emerald-800';
  if (status === 'DEGRADED') return 'bg-amber-100 text-amber-800';
  if (status === 'ERROR') return 'bg-rose-100 text-rose-800';
  return 'bg-slate-100 text-slate-600';
}

function sourceStatusLabel(status?: string): string {
  if (status === 'OK') return 'OK';
  if (status === 'DEGRADED') return 'Degradada';
  if (status === 'ERROR') return 'Error';
  return 'Sin dato';
}

function SourceCard({ title, subtitle, status, message }: {
  title: string;
  subtitle: string;
  status?: string;
  message?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{title}</p>
          <p className="mt-0.5 text-xs leading-4 text-slate-700">{subtitle}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${sourceStatusTone(status)}`}>
          {sourceStatusLabel(status)}
        </span>
      </div>
      {message && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {message}
        </p>
      )}
    </article>
  );
}
