'use client';

import Link from 'next/link';
import { ageFromIso, ConfidenceInline, fmtN, SourceBadge } from '@/components/llano/atoms';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { WeatherPayload } from '@/types/weather';

function tempColor(t: number): string {
  if (t <= 0) return '#60a5fa';
  if (t <= 10) return '#22d3ee';
  if (t <= 20) return '#34d399';
  if (t <= 30) return '#fbbf24';
  return '#f97316';
}

function residualCopy(residual: number | null): { label: string; tone: 'success' | 'warning' | 'danger' | 'default' } {
  if (residual === null) return { label: 'Sin auditoría (sensor local no disponible)', tone: 'default' };
  const abs = Math.abs(residual);
  const dir = residual > 0 ? 'sobreestima' : 'subestima';
  if (abs < 1) return { label: `Auditado:偏差 < 1 °C · ${dir}`, tone: 'success' };
  if (abs < 2.5) return { label: `Auditado偏差 ${abs.toFixed(1)} °C · ${dir}`, tone: 'warning' };
  return { label: `Auditado偏差 ${abs.toFixed(1)} °C · ${dir}`, tone: 'danger' };
}

export function PulseHero({ climate, weather, alarmCount }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  alarmCount: number;
}) {
  const local = climate.nodes.localStation;
  const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const humidity = local?.humidityPct ?? climate.eto.inputs.humidityPct;
  const dew = climate.dewPoint.dewPointC;

  const localAge = ageFromIso(local?.time ?? null);
  const isLocalLive = local?.status === 'OK' && localAge !== null && localAge < 180;
  const isLocalStale = local !== null && !isLocalLive;
  const noLocal = local === null;

  const residual = climate.calibration.residualC;
  const residualInfo = residualCopy(residual);

  let source: 'sensor_propio' | 'modelo_calibrado' | 'aemet' | 'open_meteo';
  if (isLocalLive) source = 'sensor_propio';
  else if (climate.nodes.baza.status === 'OK') source = 'aemet';
  else if (climate.nodes.baza.status === 'FALLBACK') source = 'modelo_calibrado';
  else if (climate.nodes.sanClemente.status === 'OK') source = 'modelo_calibrado';
  else if (climate.quality.confidencePct >= 50) source = 'modelo_calibrado';
  else source = 'open_meteo';

  const toneClass: Record<typeof source, 'OK' | 'FALLBACK' | 'MISSING' | 'DEGRADED' | null> = {
    sensor_propio: 'OK',
    modelo_calibrado: 'FALLBACK',
    aemet: 'FALLBACK',
    open_meteo: 'DEGRADED',
  };
  const sourceStatus = toneClass[source];

  const updateAge = ageFromIso(weather?.fetchedAt);
  const confidencePct = climate.quality.confidencePct;

  return (
    <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 text-white shadow-2xl">
      <div className="relative px-5 py-7 sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_46%),linear-gradient(135deg,rgba(15,23,42,1),rgba(30,64,175,0.72))]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-100">
              Observatorio del llano
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">El Pulso del Llano</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100/85">
              Temperatura local, alarmas accionables y pronóstico ajustado al microclima del casco urbano y la vega.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <SourceBadge source={source} status={sourceStatus} ageMinutes={localAge} className="bg-white/10 text-sky-100" />
              <span className="text-[11px] text-slate-300">Confianza</span>
              <ConfidenceInline pct={confidencePct} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
              {isLocalStale && localAge !== null && (
                <span className="rounded-full border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 font-bold text-rose-200">
                  ⚠ Tu sensor: hace {localAge >= 60 * 24 ? `${Math.floor(localAge / 60 / 24)} días` : localAge >= 60 ? `${Math.floor(localAge / 60)}h` : `${localAge} min`}. Estimación calibrada activa.
                </span>
              )}
              {noLocal && (
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 font-bold text-amber-200">
                  Sin miniestación propia registrada.
                </span>
              )}
              <span className={`rounded-full border px-2.5 py-1 font-bold ${residualInfo.tone === 'success' ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' : residualInfo.tone === 'warning' ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' : residualInfo.tone === 'danger' ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-white/15 bg-white/10 text-slate-300'}`}>
                {residualInfo.label}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#alertas-aemet" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-50">
                Ver alertas AEMET
              </a>
              <a href="#proximas-24h" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                Ver 24h detalladas
              </a>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">Dato local</p>
            <p className="mt-3 text-5xl font-black" style={{ color: tempColor(temp ?? 0) }}>
              {fmtN(temp, 1)}°C
            </p>
            <p className="mt-2 text-sm text-slate-100/80">
              Humedad {fmtN(humidity, 0)}% · rocío {fmtN(dew, 1)}°C
            </p>
            <p className="mt-4 rounded-2xl bg-white/10 p-3 text-sm leading-6 text-slate-100">
              {isLocalLive
                ? 'Dato en vivo desde tu miniestación'
                : climate.microclimate.inversionConditions
                  ? `Inversión térmica activa · corrección drenaje ${climate.microclimate.coldAirDrainageC.toFixed(1)}°C`
                  : isLocalStale
                    ? 'Sensor local sin lecturas frescas. Modelo calibrado al rescate.'
                    : 'Estimación calibrada desde AEMET Baza + San Clemente'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <span>
                {updateAge !== null
                  ? `Actualizado hace ${updateAge < 60 ? `${updateAge} min` : `${Math.floor(updateAge / 60)}h`}`
                  : 'Sin timestamp'}
              </span>
              <span className="rounded-full bg-rose-500/20 px-2.5 py-1 font-bold text-rose-200">
                {alarmCount} {alarmCount === 1 ? 'alarma' : 'alarmas'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
