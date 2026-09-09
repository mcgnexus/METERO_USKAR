'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { NavBottom } from '@/components/NavBottom';
import { NotificationPermission } from '@/components/NotificationPermission';
import { AgriculturalLeadForm } from '@/components/AgriculturalLeadForm';
import { HomeHero } from '@/components/HomeHero';
import { AudienceSwitcher } from '@/components/AudienceSwitcher';
import { AgriDecisionGrid } from '@/components/agricultural/AgriDecisionGrid';
import { CustomAlertPreview } from '@/components/agricultural/CustomAlertPreview';
import { TecRuralProfileSection } from '@/components/TecRuralProfileSection';
import { LocalAlarmNotifier } from '@/components/LocalAlarmNotifier';
import { TodaySummaryCard } from '@/components/weather/TodaySummaryCard';
import { HourlyForecastStrip } from '@/components/weather/HourlyForecastStrip';
import { QuickDecisionGrid } from '@/components/weather/QuickDecisionGrid';
import { AdviceGrid } from '@/components/advice/AdviceGrid';
import { SectionTitle } from '@/components/common/SectionTitle';
import { UpdatedAtNote } from '@/components/common/UpdatedAtNote';
import { NoDataState } from '@/components/common/NoDataState';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import type { HuescarWeatherResponse } from '@/types/weather-response';
import type { AdviceContext } from '@/lib/weather-advice/types';
import { madridHourFromUTC, madridMonthFromUTC, seasonFromMonth } from '@/lib/timezone';

const WeekTrend = dynamic(() => import('@/components/llano/week-tab').then((m) => ({ default: m.WeekTab })), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />,
});

export function HoyPageClient({ response }: { response: HuescarWeatherResponse }) {
  const cd = response.climate;
  const wd = response.weather;
  const fd = response.forecast;

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
    const iso = cd.generatedAt;
    const madridHour = madridHourFromUTC(iso);
    const month = madridMonthFromUTC(iso);
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
      isDaytime: madridHour >= 7 && madridHour < 20,
      month,
      season: seasonFromMonth(month),
    };
  }, [cd, wd]);

  const track = useTrackEvent();
  useEffect(() => { track('weather_view', { municipality: response.municipality }); }, [track, response.municipality]);

  if (!cd) {
    return (
      <NoDataState
        fullScreen
        title="Previsión no disponible ahora"
        message="Las fuentes meteorológicas no han devuelto datos en esta consulta. El resto de la app sigue disponible."
      />
    );
  }

  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
  const humidity = cd.nodes.localStation?.humidityPct ?? cd.eto.inputs.humidityPct ?? wd?.current?.humidityPct ?? null;

  // Tarjeta principal: usa el `current` canónico del snapshot unificado
  // (temperatura calibrada por el motor) completado con datos del motor.
  const todaySummaryCurrent = {
    time: response.current.time,
    temperatureC: response.current.temperatureC,
    apparentTemperatureC: response.current.apparentTemperatureC ?? temp,
    humidityPct: response.current.humidityPct ?? humidity ?? 50,
    precipitationMm: response.current.precipitationMm,
    weatherCode: response.current.weatherCode,
    windSpeedKmh: response.current.windSpeedKmh,
    windDirectionDeg: cd.extrapolation.bazaWindDirectionDeg ?? 0,
    windGustKmh: response.current.windGustKmh ?? 0,
    solarRadiationWm2: cd.eto.inputs.solarRadiationWm2 ?? 0,
    et0Mm: cd.eto.etoHourlyMm ?? 0,
  };

  // Día completo de horas (Open-Meteo entrega desde las 00:00 de hoy). La
  // franja arranca en "Ahora" y deja "desde medianoche" como vista secundaria.
  const hourlyTimes = wd?.hourly?.time ?? [];
  const nowIso = response.current.time || response.generatedAt;
  const allHours = hourlyTimes.map((t, k) => ({
    time: t,
    temp: wd.hourly.temperatureC[k],
    weatherCode: wd.hourly.weatherCode[k] ?? 0,
    precipitationProb: wd.hourly.precipitationProbabilityPct[k] ?? null,
  }));

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <LocalAlarmNotifier alarms={alarms} />
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-12" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
              <UpdatedAtNote response={response} />
            </div>
            <a
              href="/api/daily-card"
              download="ficha-meteo-huescar"
              onClick={() => track('daily_card_downloaded', { source: 'home' })}
              className="flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
            >
              Descargar ficha diaria
            </a>
          </div>
        </header>

        <div className="mt-3">
          <AudienceSwitcher />
        </div>

        <div className="mt-5">
          <HomeHero />
        </div>

        <div className="mt-5 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div>
        <main className="space-y-5">
          {/* 1 · Estado actual y próximas horas (desde "ahora") */}
          <section className="space-y-5">
            <TodaySummaryCard forecast={todaySummaryCurrent} />
            {allHours.length > 0 && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <SectionTitle>🕐 Próximas horas</SectionTitle>
                <HourlyForecastStrip hours={allHours} nowIso={nowIso} lookahead={6} />
              </div>
            )}
          </section>

          {/* 2 · Tres decisiones agrícolas: helada, lluvia, riego */}
          <AgriDecisionGrid response={response} />

          {/* 3 · Ejemplo concreto de aviso personalizado */}
          <CustomAlertPreview response={response} />

          {/* 4 · CTA principal + formulario corto o WhatsApp */}
          <div className="mb-1">
            <AgriculturalLeadForm />
          </div>

          {/* Activar notificaciones del navegador (mecánica de los avisos) */}
          <NotificationPermission />

          {/* 5 · Fuentes y metodología */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-slate-800">🔍 Fuentes y metodología</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  De dónde sale cada dato (AEMET, Open-Meteo, sensores locales y RAIF) y cómo lo combinamos.
                </p>
              </div>
              <a
                href="/huescar/fuentes"
                onClick={() => track('sources_navigation_clicked', { source: 'home' })}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Ver fuentes
              </a>
            </div>
          </section>

          {/* 6 · Contenido general para población no agrícola (más abajo, sin competir) */}
          <div className="border-t-2 border-dashed border-slate-200 pt-6">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Para todos los vecinos
            </p>

            {fd && fd.forecastDays && fd.forecastDays.length > 0 && (
              <section className="mt-4 bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                <SectionTitle>📅 Tendencia semanal</SectionTitle>
                <WeekTrend daily={wd?.daily ?? null} forecast={fd} />
              </section>
            )}

            {adviceCtx && (
              <section className="mt-4">
                <SectionTitle>⚡ Planes del día</SectionTitle>
                <QuickDecisionGrid ctx={adviceCtx} />
              </section>
            )}

            {adviceCtx && (
              <section className="mt-4">
                <SectionTitle>💡 Consejos para hoy</SectionTitle>
                <AdviceGrid ctx={adviceCtx} />
              </section>
            )}

            <TecRuralProfileSection />

            <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer list-none text-sm font-black text-slate-800">📊 Ver datos técnicos</summary>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <DataRow label="Viento medio" value={`${(cd.nodes.radiationWind.windSpeed2mKmh ?? 0).toFixed(0)} km/h`} />
                <DataRow label="Ráfagas" value={wd?.current?.windGustKmh != null ? `${wd.current.windGustKmh.toFixed(0)} km/h` : '—'} />
                <DataRow label="Humedad" value={humidity != null ? `${humidity.toFixed(0)}%` : '—'} />
                <DataRow label="Presión" value={cd.extrapolation.pressureHPa != null ? `${cd.extrapolation.pressureHPa.toFixed(0)} hPa` : '—'} />
                <DataRow label="Radiación" value={cd.eto.inputs.solarRadiationWm2 != null ? `${cd.eto.inputs.solarRadiationWm2.toFixed(0)} W/m²` : '—'} />
                <DataRow label="ET0" value={cd.eto.etoHourlyMm != null ? `${cd.eto.etoHourlyMm.toFixed(1)} mm` : '—'} />
              </div>
            </details>
          </div>
        </main>
        </div>
        <aside className="hidden space-y-4 lg:block">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Panel rápido</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Decide con contexto</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Consulta la evolución, el campo y los avisos sin abandonar esta pantalla.</p>
            <div className="mt-4 grid gap-2">
            <a href="/huescar/campo" onClick={() => track('field_navigation_clicked', { source: 'home' })} className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100">🌱 Resumen agrícola</a>
            <a href="/huescar/alertas" onClick={() => track('alerts_navigation_clicked', { source: 'home' })} className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-900 hover:bg-rose-100">⚠️ Ver alertas {alarms.length > 0 ? `(${alarms.length})` : ''}</a>
              <a href="/huescar/fuentes" onClick={() => track('sources_navigation_clicked', { source: 'home-aside' })} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">🔎 Fuentes y fiabilidad</a>
            </div>
          </section>
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-sm font-black text-emerald-950">¿Necesitas ayuda para tu finca?</p>
            <p className="mt-1 text-xs leading-5 text-emerald-900/80">TecRural puede orientarte con riego, heladas, sensores y automatización.</p>
            <a href="/huescar/contacto" className="mt-3 inline-flex rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">Quiero avisos para mi finca</a>
          </section>
        </aside>
        </div>
      </div>

      <NavBottom weatherAlertCount={alarms.length} />
      <div className="fixed bottom-[72px] left-3 right-3 z-40 lg:hidden"><a href="/huescar/contacto" onClick={() => track('cta_clicked', { context: 'mobile-fixed', cta: 'Recibir avisos para mi finca' })} className="flex min-h-[52px] items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-black text-white shadow-xl hover:bg-emerald-800">Recibir avisos para mi finca</a></div>

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
