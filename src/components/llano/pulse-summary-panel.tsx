'use client';

import { useState } from 'react';
import { fmtN } from '@/components/llano/atoms';
import { weatherEmoji, weatherCodeDescription } from '@/lib/display';
import {
  interpretTemperature,
  interpretRain,
  interpretSoilTemp,
  interpretWindForTreatment,
  interpretFrostRisk,
  interpretTHI,
} from '@/lib/interpretation';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherPayload } from '@/types/weather';
import type { PulseAlarm } from '@/components/llano/alarms-logic';

type Depth = 'essential' | 'practical';

export function SummaryPanel({
  depth,
  climate,
  weather,
  alarms,
  onShowPractical,
  onShowTechnical,
}: {
  depth: Depth;
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  alarms: PulseAlarm[];
  onShowPractical: () => void;
  onShowTechnical: () => void;
}) {
  const local = climate.nodes.localStation;
  const hasLocalStation = local?.status === 'OK';
  const stationName = local?.name ?? null;
  const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC ?? 0;
  const feelsLike = temp;
  const humidity: number | null = local?.humidityPct ?? climate.eto.inputs.humidityPct ?? climate.extrapolation.humidityPct ?? null;
  const windSpeed = climate.nodes.radiationWind.windSpeed2mKmh ?? 0;
  const soil10 = climate.exoticVariables.soilTemp10cmC;
  const agri = weather?.agricultural ?? null;
  const livestock = weather?.livestock ?? null;
  const mainAlarm = alarms[0] ?? null;

  const tempInsight = interpretTemperature(temp, feelsLike, humidity, windSpeed);
  const rainInsight = interpretRain(weather?.hourly?.precipitationProbabilityPct?.[0], weather?.hourly?.precipitationMm?.[0]);
  const soilInsight10 = interpretSoilTemp(soil10, '10cm');
  const treatmentInsight = interpretWindForTreatment(windSpeed);
  const frostInsight = interpretFrostRisk(agri?.frostRisk48h);
  const thiInsight = interpretTHI(livestock?.thi ?? null);
  const principalRisk = principalRiskLabel({ mainAlarm, temp, humidity, weather });
  const irrigation = irrigationLabel(agri?.recommendedIrrigationLitersM2);
  const wcode = weather?.current?.weatherCode ?? 0;

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

  const criticalAlarms = alarms.filter((a) => a.level === 'critico');
  const warningAlarms = alarms.filter((a) => a.level === 'precaucion');
  const infoAlarms = alarms.filter((a) => a.level === 'aviso' || a.level === 'info');

  return (
    <div className="space-y-4 pb-24">
      <section className={`overflow-hidden rounded-[28px] bg-gradient-to-br ${tempBg(temp)} p-6 text-white shadow-lg`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold uppercase tracking-wider opacity-90">Hoy en Huéscar</p>
              {hasLocalStation && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold backdrop-blur-sm" title={`Estación: ${stationName ?? 'local'}`}>
                  📡 Local
                </span>
              )}
            </div>
            <p className="mt-1 text-6xl font-black tracking-tight drop-shadow-md" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              {fmtN(temp, 1)}°C
            </p>
            <p className="mt-2 text-lg font-bold">{mainWeatherLabel}</p>
            <p className="mt-1 text-sm opacity-90">{weatherCodeDescription(wcode)}</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/20 backdrop-blur-sm px-4 py-3 text-center">
            <span className="text-4xl">{weatherEmoji(wcode)}</span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <QuickCard emoji="🌡️" label="Sensación" value={`${fmtN(feelsLike, 0)}°`} bg="bg-orange-50" text="text-orange-700" />
        <QuickCard emoji="💧" label="Humedad" value={`${fmtN(humidity, 0)}%`} bg="bg-sky-50" text="text-sky-700" />
        <QuickCard emoji="💨" label="Viento" value={`${fmtN(windSpeed, 0)} km/h`} bg="bg-emerald-50" text="text-emerald-700" />
      </div>

      {!hasLocalStation && (
        <div className="flex items-center gap-2 rounded-2xl bg-white/60 px-4 py-2 text-xs text-slate-500 shadow-sm ring-1 ring-slate-100">
          <span className="text-base">📡</span>
          <span>Datos de respaldo — estación local no disponible</span>
        </div>
      )}

      {depth === 'essential' ? (
        <>
          <section className="rounded-[24px] bg-white p-5 shadow-md border border-slate-100">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-2xl">📌</span>
              <h2 className="text-base font-black text-slate-900">Lo importante hoy</h2>
            </div>
            <p className="text-lg font-bold text-slate-800">{principalRisk}</p>
            <p className="mt-2 text-sm text-slate-600">{whatToDo.canDo[0]}</p>
          </section>

          <button
            type="button"
            onClick={onShowPractical}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-4 text-base font-black text-white shadow-lg transition hover:bg-sky-800"
          >
            👀 Ver modo práctico
          </button>
        </>
      ) : (
        <>
          {alarms.length > 0 && (
            <section className="rounded-[24px] border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-2xl">🔔</span>
                <h2 className="text-base font-black text-amber-900">{alarms.length === 1 ? '1 alerta activa' : `${alarms.length} alertas activas`}</h2>
              </div>
              <div className="space-y-2">
                {criticalAlarms.slice(0, 2).map((a, i) => (
                  <div key={`crit-${i}`} className={`rounded-xl p-3 ${alarmColor(a.level)} shadow-sm`}>
                    <p className="text-sm font-bold">{alarmEmoji(a.level)} {a.title}</p>
                    <p className="mt-1 text-xs opacity-90">{a.message}</p>
                  </div>
                ))}
                {warningAlarms.slice(0, 2).map((a, i) => (
                  <div key={`warn-${i}`} className={`rounded-xl p-3 ${alarmColor(a.level)} shadow-sm`}>
                    <p className="text-sm font-bold">{alarmEmoji(a.level)} {a.title}</p>
                    <p className="mt-1 text-xs opacity-90">{a.message}</p>
                  </div>
                ))}
                {infoAlarms.slice(0, 1).map((a, i) => (
                  <div key={`info-${i}`} className={`rounded-xl p-3 ${alarmColor(a.level)} shadow-sm`}>
                    <p className="text-sm font-bold">{alarmEmoji(a.level)} {a.title}</p>
                  </div>
                ))}
                {alarms.length > 5 && <p className="mt-2 text-center text-xs font-bold text-amber-800">+{alarms.length - 5} alertas más en modo técnico</p>}
              </div>
            </section>
          )}

          <section className="rounded-[24px] bg-white p-5 shadow-md border border-slate-100">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              <h2 className="text-base font-black text-slate-900">Qué hacer hoy</h2>
            </div>
            <div className="space-y-3">
              {whatToDo.canDo.length > 0 && (
                <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4">
                  <p className="mb-2 text-sm font-black text-emerald-800">✅ Puedes hacer</p>
                  <ul className="space-y-2">
                    {whatToDo.canDo.slice(0, 2).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                        <span className="mt-0.5 text-emerald-500">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {whatToDo.caution.length > 0 && (
                <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                  <p className="mb-2 text-sm font-black text-amber-800">⚠️ Ten cuidado</p>
                  <ul className="space-y-2">
                    {whatToDo.caution.slice(0, 2).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                        <span className="mt-0.5 text-amber-500">!</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {whatToDo.avoid.length > 0 && (
                <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4">
                  <p className="mb-2 text-sm font-black text-rose-800">❌ Evita</p>
                  <ul className="space-y-2">
                    {whatToDo.avoid.slice(0, 2).map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-rose-900">
                        <span className="mt-0.5 text-rose-500">✕</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] bg-gradient-to-br from-sky-50 to-blue-50 p-5 shadow-md border-2 border-sky-200">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-2xl">🌾</span>
              <h2 className="text-base font-black text-sky-900">Campo</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldQuickCard emoji="💧" label="Riego" value={irrigation} color={agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 ? 'text-sky-700' : 'text-emerald-700'} />
              <FieldQuickCard emoji="❄️" label="Helada" value={frostInsight.label} color={frostInsight.label === 'Sin riesgo' ? 'text-emerald-700' : 'text-rose-700'} />
              <FieldQuickCard emoji="🌬️" label="Tratamientos" value={treatmentInsight.label} color={windSpeed <= 15 ? 'text-emerald-700' : windSpeed <= 25 ? 'text-amber-700' : 'text-rose-700'} />
              <FieldQuickCard emoji="🌡️" label="Suelo" value={soilInsight10.label === 'Sin dato' ? 'Sin dato' : `${fmtN(soil10, 0)}°C`} color="text-slate-700" />
            </div>
            <div className="mt-4 rounded-xl bg-white/70 p-3">
              <p className="text-sm font-semibold text-slate-700">
                {agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 ? '💧 Revisa la humedad del suelo antes de regar' : '✅ Riego normal, sin cambios urgentes'}
              </p>
            </div>
          </section>

          {livestock && (
            <section className="rounded-[24px] border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-md">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-2xl">🐄</span>
                <h2 className="text-base font-black text-amber-900">Ganadería</h2>
              </div>
              <div className="rounded-xl bg-white/70 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{livestock?.thi != null && livestock.thi >= 80 ? '🥵' : livestock?.thi != null && livestock.thi >= 72 ? '😰' : '😊'}</span>
                  <div>
                    <p className="text-lg font-black text-amber-900">{thiInsight.label}</p>
                    <p className="text-sm text-amber-800">{thiInsight.action}</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className={`rounded-[24px] border-2 p-5 shadow-md ${
            mainAlarm?.level === 'critico' ? 'border-red-300 bg-red-50' :
            mainAlarm?.level === 'precaucion' ? 'border-orange-300 bg-orange-50' :
            'border-emerald-300 bg-emerald-50'
          }`}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-2xl">{mainAlarm?.level === 'critico' ? '🚨' : mainAlarm?.level === 'precaucion' ? '⚠️' : '✅'}</span>
              <h2 className="text-base font-black text-slate-900">Situación</h2>
            </div>
            <p className="text-lg font-bold text-slate-800">{principalRisk}</p>
            <p className="mt-2 text-sm text-slate-600">{temp >= 32 ? '🔥 Mucho calor. Bebe agua y busca sombra.' : temp <= 5 ? '❄️ Frío intenso. Abrígate bien.' : '🌤️ Condiciones normales. Disfruta del día.'}</p>
          </section>

          <button
            type="button"
            onClick={onShowTechnical}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-base font-black text-white shadow-lg transition hover:bg-slate-800"
          >
            🔧 Ver detalle técnico
          </button>
        </>
      )}
    </div>
  );
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

function tempColor(t: number): string {
  if (t <= 0) return '#3b82f6';
  if (t <= 10) return '#06b6d4';
  if (t <= 20) return '#10b981';
  if (t <= 25) return '#f59e0b';
  if (t <= 32) return '#f97316';
  if (t <= 38) return '#ef4444';
  return '#dc2626';
}

function tempBg(t: number): string {
  if (t <= 0) return 'from-blue-500 to-cyan-400';
  if (t <= 10) return 'from-cyan-500 to-teal-400';
  if (t <= 20) return 'from-emerald-400 to-teal-300';
  if (t <= 25) return 'from-amber-400 to-orange-300';
  if (t <= 32) return 'from-orange-400 to-red-400';
  if (t <= 38) return 'from-red-400 to-rose-500';
  return 'from-red-600 to-rose-700';
}

function alarmColor(level: string): string {
  if (level === 'critico') return 'bg-red-500 text-white border-red-400';
  if (level === 'precaucion') return 'bg-orange-400 text-white border-orange-300';
  if (level === 'aviso') return 'bg-yellow-400 text-yellow-900 border-yellow-300';
  return 'bg-sky-400 text-white border-sky-300';
}

function alarmEmoji(level: string): string {
  if (level === 'critico') return '🚨';
  if (level === 'precaucion') return '⚠️';
  if (level === 'aviso') return '⚡';
  return 'ℹ️';
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
    temp >= 32 ? 'Trabaja temprano o al final del día.' : 'Puedes hacer tareas normales al aire libre.',
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

function QuickCard({ emoji, label, value, bg, text }: { emoji: string; label: string; value: string; bg: string; text: string }) {
  return (
    <div className={`rounded-2xl ${bg} p-4 text-center shadow-sm border border-white`}>
      <p className="text-2xl mb-1">{emoji}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-lg font-black ${text}`}>{value}</p>
    </div>
  );
}

function FieldQuickCard({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/80 p-3 text-center shadow-sm">
      <p className="text-xl mb-1">{emoji}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-black ${color}`}>{value}</p>
    </div>
  );
}
