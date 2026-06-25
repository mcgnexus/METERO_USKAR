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
import { fmtN } from '@/components/llano/atoms';
import {
  interpretTemperature,
  interpretHumidity,
  interpretWind,
  interpretRain,
  interpretTHI,
  interpretSoilTemp,
  interpretWindForTreatment,
  interpretFrostRisk,
} from '@/lib/interpretation';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';
import type { ForecastPayload } from '@/types/forecast';
import type { PulseAlarm } from '@/components/llano/alarms-logic';

const NowTab = dynamic(() => import('@/components/llano/now-tab').then((m) => ({ default: m.NowTab })));
const HoursTab = dynamic(() => import('@/components/llano/hours-tab').then((m) => ({ default: m.HoursTab })));
const FieldTab = dynamic(() => import('@/components/llano/field-tab').then((m) => ({ default: m.FieldTab })));
const AlertsTab = dynamic(() => import('@/components/llano/alerts-tab').then((m) => ({ default: m.AlertsTab })));
const DataTab = dynamic(() => import('@/components/llano/data-tab').then((m) => ({ default: m.DataTab })));

type UiMode = 'simple' | 'technical';
const MODE_STORAGE_KEY = 'llano-pulse-mode';

function loadInitialMode(): UiMode {
  if (typeof window === 'undefined') return 'simple';
  return window.localStorage.getItem(MODE_STORAGE_KEY) === 'technical' ? 'technical' : 'simple';
}

function confidenceLabel(pct: number): string {
  if (pct >= 80) return 'alta';
  if (pct >= 60) return 'media';
  return 'baja';
}

function windLabel(speedKmh: number): string {
  if (speedKmh < 10) return 'flojo';
  if (speedKmh < 25) return 'moderado';
  return 'fuerte';
}

function irrigationLabel(liters?: number | null): string {
  if (liters === null || liters === undefined || !Number.isFinite(liters)) return 'sin datos';
  if (liters >= 40) return 'alto';
  if (liters >= 20) return 'medio';
  if (liters > 0) return 'bajo';
  return 'sin riego adicional';
}

function principalRiskLabel({
  mainAlarm,
  temp,
  humidity,
  weather,
}: {
  mainAlarm: PulseAlarm | null;
  temp: number;
  humidity: number | null;
  weather: WeatherPayload | null;
}): string {
  if (temp >= 38) return 'Demasiado calor';
  if (temp >= 32 && (humidity ?? 100) <= 30) return 'Calor y sequedad';
  if ((humidity ?? 100) <= 15) return 'Ambiente muy seco';
  if (weather?.agricultural?.frostRisk48h && weather.agricultural.frostRisk48h !== 'none') return 'Posible helada';
  if (mainAlarm?.level === 'critico') return 'Hay una alerta importante';
  if (mainAlarm?.level === 'precaucion') return 'Conviene estar atento';
  return 'Sin problemas destacados';
}

function useModeState(): [UiMode, (mode: UiMode) => void] {
  const [mode, setMode] = useState<UiMode>(loadInitialMode);

  useEffect(() => {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  return [mode, setMode];
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
      <div className="mx-auto max-w-lg px-4 pt-4 pb-4">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
              <h1 className="mt-0.5 text-xl font-black text-slate-900">Huéscar</h1>
            </div>
            <ModeSwitcher mode={mode} onChange={setMode} />
          </div>
        </header>

        {mode === 'technical' && activeTab === 'now' && (
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
          {mode === 'simple' ? (
            <SimpleSummaryPanel climate={cd} weather={wd} alarms={alarms} onShowTechnical={() => setMode('technical')} />
          ) : (
            <TabContent
              activeTab={activeTab}
              climate={cd}
              weather={wd}
              forecast={forecast.data}
              alarms={alarms}
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
        onClick={() => onChange('simple')}
        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${mode === 'simple' ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
      >
        Simple
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

function SimpleSummaryPanel({
  climate,
  weather,
  alarms,
  onShowTechnical,
}: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  alarms: PulseAlarm[];
  onShowTechnical: () => void;
}) {
  const current = weather?.current;
  const temp = current?.temperatureC ?? climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const feelsLike = current?.apparentTemperatureC ?? temp;
  const humidity = current?.humidityPct ?? climate.extrapolation.humidityPct ?? climate.eto.inputs.humidityPct ?? null;
  const windSpeed = current?.windSpeedKmh ?? climate.nodes.radiationWind.windSpeed2mKmh;
  const windGust = current?.windGustKmh ?? null;
  const soil10 = climate.exoticVariables.soilTemp10cmC;
  const soil40 = climate.exoticVariables.soilTemp40cmC;
  const agri = weather?.agricultural ?? null;
  const livestock = weather?.livestock ?? null;
  const mainAlarm = alarms[0] ?? null;

  const tempInsight = interpretTemperature(temp, feelsLike, humidity, windSpeed);
  const humidityInsight = interpretHumidity(humidity, temp);
  const windInsight = interpretWind(windSpeed, windGust);
  const rainInsight = interpretRain(weather?.hourly?.precipitationProbabilityPct?.[0], weather?.hourly?.precipitationMm?.[0]);
  const soilInsight10 = interpretSoilTemp(soil10, '10cm');
  const soilInsight40 = interpretSoilTemp(soil40, '40cm');
  const treatmentInsight = interpretWindForTreatment(windSpeed);
  const frostInsight = interpretFrostRisk(agri?.frostRisk48h);
  const thiInsight = interpretTHI(livestock?.thi ?? null);
  const confidencePct = Math.round(weather?.confidencePct ?? climate.quality.confidencePct);
  const confidence = confidenceLabel(confidencePct);
  const principalRisk = principalRiskLabel({ mainAlarm, temp, humidity, weather });
  const irrigation = irrigationLabel(agri?.recommendedIrrigationLitersM2);

  const whatToDo = buildSimpleActionPlan({
    temp,
    humidity,
    windSpeed,
    rainLabel: rainInsight.label,
    treatmentLabel: treatmentInsight.label,
    mainAlarm,
    livestockTone: thiInsight.tone,
  });

  const mainWeatherLabel =
    temp >= 38 ? 'Hace mucho calor' : temp >= 32 && (humidity ?? 100) <= 30 ? 'Hace calor y el ambiente está seco' : tempInsight.label;

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Hoy en Huéscar</p>
            <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">{fmtN(temp, 1)}°C</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{mainWeatherLabel}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-slate-950 px-3 py-2 text-right text-white">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-300">Confianza</p>
            <p className="text-lg font-black leading-none">{confidence}</p>
            <p className="text-[10px] text-slate-300">{confidencePct}%</p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <StatPill label="Sensación térmica" value={`${fmtN(feelsLike, 1)}°C`} />
          <StatPill label="Humedad" value={`${fmtN(humidity, 0)}%`} />
          <StatPill label="Viento" value={`${windLabel(windSpeed)} · ${fmtN(windSpeed, 0)} km/h`} />
        </div>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-800">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Recomendación</p>
          <p className="mt-1 leading-6">
            {temp >= 32
              ? 'El día viene pesado, seco y con bastante calor.'
              : temp <= 5
                ? 'Hace frío y puede haber helada de madrugada.'
                : tempInsight.detail}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-600">{humidityInsight.label} · {windInsight.label}</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">Lo más importante: {principalRisk}</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Confianza del dato: {confidence}</p>
        </div>
        <button
          type="button"
          onClick={onShowTechnical}
          className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
        >
          Ver detalle técnico
        </button>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Alerta principal</p>
        {mainAlarm ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-800">{mainAlarm.title}</p>
            <p className="mt-1 text-sm leading-6 text-rose-900">{mainAlarm.message}</p>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">Sin alertas importantes</p>
            <p className="mt-1 text-sm leading-6 text-emerald-900">Todo bastante tranquilo, pero conviene seguir mirando calor, sequedad y viento.</p>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Qué hacer hoy</p>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-900">
          <ActionGroup title="✅ Puedes hacer" items={whatToDo.canDo} tone="emerald" />
          <ActionGroup title="⚠️ Ten cuidado" items={whatToDo.caution} tone="amber" />
          <ActionGroup title="❌ Evita" items={whatToDo.avoid} tone="rose" />
        </div>
      </section>

      <section className="rounded-[28px] border border-sky-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Campo</p>
        <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-800">
          <StatRow label="Riego orientativo" value={irrigation} />
          <StatRow label="Riesgo de helada" value={frostInsight.label} />
          <StatRow label="Tratamientos" value={treatmentInsight.label} />
          <StatRow label="Suelo" value={soilInsight10.label === 'Sin dato' ? 'Sin dato' : soilInsight10.label} />
          <p className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">{agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 ? 'Conviene revisar la humedad del suelo antes de decidir el riego.' : 'Riego normal, sin cambios urgentes.'}</p>
          {soil10 !== null && soil40 !== null && (
            <p className="text-xs font-semibold text-slate-600">Subsuelo: {soilInsight40.label.toLowerCase()}</p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">Ganadería</p>
        <div className="mt-4 grid gap-2 text-sm leading-6 text-slate-800">
          <StatRow label="Estrés térmico" value={thiInsight.label} />
          <p className="rounded-2xl bg-amber-50 p-3 text-slate-900">{livestock?.thi !== undefined ? 'Sombra y agua fresca.' : 'Sin datos ganaderos disponibles.'}</p>
          <p className="rounded-2xl bg-slate-50 p-3 text-slate-700">{livestock?.thi !== undefined ? 'Evita movimientos en las horas de más calor.' : 'Mantén la vigilancia habitual.'}</p>
        </div>
      </section>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-700">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}

function ActionGroup({ title, items, tone }: { title: string; items: string[]; tone: 'emerald' | 'amber' | 'rose' }) {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-rose-200 bg-rose-50 text-rose-900';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="font-black">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function buildSimpleActionPlan({
  temp,
  humidity,
  windSpeed,
  rainLabel,
  treatmentLabel,
  mainAlarm,
  livestockTone,
}: {
  temp: number;
  humidity: number | null;
  windSpeed: number;
  rainLabel: string;
  treatmentLabel: string;
  mainAlarm: PulseAlarm | null;
  livestockTone: string;
}) {
  const canDo = [
    temp >= 32 ? 'Si puedes, trabaja temprano o al final del día.' : 'Puedes hacer tareas normales al aire libre.',
    treatmentLabel === 'Optimo para tratamientos' || treatmentLabel === 'Apto con precaucion'
      ? 'Los tratamientos van bien si el viento sigue bajo.'
      : 'Mira el viento antes de tratar.',
    humidity !== null && humidity <= 25 ? 'Comprueba la tierra antes de regar.' : 'Riego normal, sin cambios urgentes.',
  ];

  const caution = [
    temp >= 32 ? 'El calor aprieta.' : temp <= 5 ? 'Frío y posible helada.' : 'Vigila cambios rápidos del tiempo.',
    humidity !== null && humidity <= 25 ? 'El ambiente está muy seco.' : 'Mantén hidratación y algo de sombra.',
    rainLabel !== 'Sin lluvia' ? 'Puede llover en unas horas.' : 'No se espera lluvia importante ahora mismo.',
  ];

  const avoid = [
    temp >= 32 ? 'Trabajar al sol entre 12:00 y 18:00.' : 'No hay restricciones graves, pero mantén vigilancia.',
    windSpeed > 20 ? 'Hacer tratamientos si el viento sube.' : 'Dejar animales sin sombra ni agua fresca.',
    mainAlarm?.level === 'critico' ? 'Pasar por alto la alerta principal.' : 'Pasar por alto los avisos si el tiempo cambia.',
  ];

  if (livestockTone === 'danger') {
    avoid[1] = 'Dejar animales sin agua y sombra.';
  }

  return { canDo, caution, avoid };
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
        />
      );
    case 'alerts':
      return <AlertsTab alarms={alarms} />;
    case 'data':
      return <DataTab climate={climate} weather={weather} forecast={forecast} />;
  }
}
