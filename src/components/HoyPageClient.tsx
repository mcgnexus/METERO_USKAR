'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { NavBottom } from '@/components/NavBottom';
import { NotificationPermission } from '@/components/NotificationPermission';
import { AgriculturalLeadForm } from '@/components/AgriculturalLeadForm';
import { TecRuralCtaBanner } from '@/components/TecRuralCtaBanner';
import { TecRuralProfileSection } from '@/components/TecRuralProfileSection';
import { LocalAlarmNotifier } from '@/components/LocalAlarmNotifier';
import { TodaySummaryCard } from '@/components/weather/TodaySummaryCard';
import { HourlyForecastStrip } from '@/components/weather/HourlyForecastStrip';
import { QuickDecisionGrid } from '@/components/weather/QuickDecisionGrid';
import { AdviceGrid } from '@/components/advice/AdviceGrid';
import { SectionTitle } from '@/components/common/SectionTitle';
import PwaRegister from '@/components/PwaRegister';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';
import type { AdviceContext } from '@/lib/weather-advice/types';
import { madridHourFromUTC, madridMonthFromUTC, seasonFromMonth } from '@/lib/timezone';

const WeekTrend = dynamic(() => import('@/components/llano/week-tab').then((m) => ({ default: m.WeekTab })), {
  ssr: false,
  loading: () => <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />,
});

export function HoyPageClient({
  initialClimateData,
  initialWeatherData,
  initialForecastData,
}: {
  initialClimateData: ClimateCalibrationPayload | null;
  initialWeatherData: WeatherPayload | null;
  initialForecastData: ForecastPayload | null;
}) {
  const cd = initialClimateData;
  const wd = initialWeatherData;
  const fd = initialForecastData;

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
  useEffect(() => { track('weather_view'); }, [track]);

  if (!cd) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4">
        <div className="rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="font-semibold text-rose-700">No se pudo cargar la previsión</p>
          <p className="mt-2 text-sm text-slate-500">Los datos meteorológicos no están disponibles ahora.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-full bg-sky-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-800">Reintentar</button>
        </div>
      </div>
    );
  }

  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
  const humidity = cd.nodes.localStation?.humidityPct ?? cd.eto.inputs.humidityPct ?? wd?.current?.humidityPct ?? null;
  const windSpeed = cd.nodes.radiationWind.windSpeed2mKmh ?? 0;
  const wcode = wd?.current?.weatherCode ?? 0;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <LocalAlarmNotifier alarms={alarms} />
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
              <h1 className="mt-0.5 text-xl font-black text-slate-900">Meteo Huéscar</h1>
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

        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
        <div>
        <div className="mb-3 min-h-[92px]">
          <NotificationPermission />
        </div>

        <PwaRegister />

        <main className="space-y-5">
          <TodaySummaryCard forecast={wd?.current ?? {
            time: cd.generatedAt,
            temperatureC: temp,
            apparentTemperatureC: temp,
            humidityPct: humidity ?? 50,
            precipitationMm: wd?.current?.precipitationMm ?? 0,
            weatherCode: wcode,
            windSpeedKmh: windSpeed,
            windDirectionDeg: cd.extrapolation.bazaWindDirectionDeg ?? 0,
            windGustKmh: wd?.current?.windGustKmh ?? 0,
            solarRadiationWm2: cd.eto.inputs.solarRadiationWm2 ?? 0,
            et0Mm: cd.eto.etoHourlyMm ?? 0,
          }} />

          {adviceCtx && (
            <section>
              <SectionTitle>⚡ Decisiones rápidas</SectionTitle>
              <QuickDecisionGrid ctx={adviceCtx} />
            </section>
          )}

           {wd?.hourly && wd.hourly.time.length > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <SectionTitle>🕐 Próximas horas</SectionTitle>
              <HourlyForecastStrip
                hours={wd.hourly.time.slice(0, 8).map((t, i) => ({
                  time: t,
                  temp: wd.hourly.temperatureC[i],
                  weatherCode: wd.hourly.weatherCode[i] ?? 0,
                  precipitationProb: wd.hourly.precipitationProbabilityPct[i] ?? null,
                }))}
              />
             </section>
           )}

           <TecRuralCtaBanner context="home" />

           {fd && fd.forecastDays && fd.forecastDays.length > 0 && (
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
              <SectionTitle>📅 Tendencia semanal</SectionTitle>
              <WeekTrend daily={wd?.daily ?? null} forecast={fd} />
            </section>
          )}

          {adviceCtx && (
            <section>
              <SectionTitle>💡 Consejos para hoy</SectionTitle>
              <AdviceGrid ctx={adviceCtx} />
            </section>
          )}

           <TecRuralProfileSection />

          <div className="mb-1">
            <AgriculturalLeadForm />
            <p className="mt-2 text-center">
              <a href="/huescar/contacto" className="text-[10px] font-bold uppercase tracking-wider text-sky-700 hover:text-sky-900">
                ¿Necesitas ayuda personalizada? → Contacto
              </a>
            </p>
          </div>

          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer list-none text-sm font-black text-slate-800">📊 Ver datos técnicos</summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <DataRow label="Viento medio" value={`${windSpeed.toFixed(0)} km/h`} />
              <DataRow label="Ráfagas" value={wd?.current?.windGustKmh != null ? `${wd.current.windGustKmh.toFixed(0)} km/h` : '—'} />
              <DataRow label="Humedad" value={humidity != null ? `${humidity.toFixed(0)}%` : '—'} />
              <DataRow label="Presión" value={cd.extrapolation.pressureHPa != null ? `${cd.extrapolation.pressureHPa.toFixed(0)} hPa` : '—'} />
              <DataRow label="Radiación" value={cd.eto.inputs.solarRadiationWm2 != null ? `${cd.eto.inputs.solarRadiationWm2.toFixed(0)} W/m²` : '—'} />
              <DataRow label="ET0" value={cd.eto.etoHourlyMm != null ? `${cd.eto.etoHourlyMm.toFixed(1)} mm` : '—'} />
            </div>
          </details>

          <div className="text-center pb-4">
            <a href="/huescar/fuentes" className="text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-800">
              🔍 Fuentes y fiabilidad
            </a>
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
              <a href="/huescar/fuentes" className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100">🔎 Fuentes y fiabilidad</a>
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

      <NavBottom alertCount={alarms.length} />
      <div className="fixed bottom-[72px] left-3 right-3 z-40 lg:hidden"><a href="/huescar/contacto" onClick={() => track('cta_clicked', { context: 'mobile-fixed', cta: 'Recibir avisos agrícolas' })} className="flex min-h-[52px] items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-black text-white shadow-xl hover:bg-emerald-800">Recibir avisos agrícolas</a></div>
      <a href="https://wa.me/34614242716?text=Hola%2C%20he%20consultado%20Meteo%20Hu%C3%A9scar%20y%20quiero%20recibir%20avisos%20para%20mi%20finca." target="_blank" rel="noreferrer" onClick={() => track('whatsapp_clicked', { context: 'mobile-floating', cta: 'Hablar con TecRural' })} aria-label="Hablar con TecRural por WhatsApp" className="fixed bottom-[136px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-xl text-white shadow-xl hover:bg-emerald-700 lg:hidden"><span aria-hidden="true">💬</span></a>
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
