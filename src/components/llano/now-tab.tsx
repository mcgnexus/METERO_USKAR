'use client';

import { useState, useEffect } from 'react';
import { fmtN } from '@/components/llano/atoms';
import { weatherCodeDescription, weatherEmoji, windDirection } from '@/lib/display';
import { thermalBg } from '@/components/llano/thermal-style';
import {
  interpretTemperature,
  interpretHumidity,
  interpretWind,
  interpretRain,
  interpretCloudCover,
  interpretHeatRisk,
  interpretTHI,
} from '@/lib/interpretation';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { WeatherPayload } from '@/types/weather';
import type { PulseAlarm } from '@/components/llano/alarms-logic';

function tempColor(t: number): string {
  if (t <= 0) return '#2563eb';
  if (t <= 10) return '#0891b2';
  if (t <= 20) return '#15803d';
  if (t <= 30) return '#b45309';
  if (t <= 35) return '#c2410c';
  return '#b91c1c';
}

function dewPointC(tempC: number | null | undefined, rhPct: number | null | undefined): number | null {
  if (tempC == null || rhPct == null || rhPct <= 0) return null;
  const a = 17.62, b = 243.12;
  const gamma = Math.log(rhPct / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

export function NowTab({ climate, weather, alarms }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  alarms: PulseAlarm[];
}) {
  const local = climate.nodes.localStation;
  const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC ?? 0;
  const humidity: number | null = local?.humidityPct ?? climate.eto.inputs.humidityPct ?? weather?.current?.humidityPct ?? null;
  const windSpeed = climate.nodes.radiationWind.windSpeed2mKmh ?? 0;
  const windGust = weather?.current?.windGustKmh != null
    ? weather.current.windGustKmh * climate.microclimate.windGustReductionFactor
    : null;
  const windDir = climate.extrapolation.bazaWindDirectionDeg ?? weather?.current?.windDirectionDeg ?? null;
  const wcode = weather?.current?.weatherCode ?? 0;
  const [updateAge, setUpdateAge] = useState<number | null>(null);

  useEffect(() => {
    setUpdateAge(ageFromIso(climate.generatedAt));
    const id = setInterval(() => setUpdateAge(ageFromIso(climate.generatedAt)), 60000);
    return () => clearInterval(id);
  }, [climate.generatedAt]);
  const nowcast = weather?.nowcast;

  const t = interpretTemperature(temp, temp, humidity, windSpeed);
  const h = interpretHumidity(humidity, temp);
  const w = interpretWind(windSpeed, windGust);
  const r = interpretRain(weather?.hourly?.precipitationProbabilityPct?.[0], weather?.hourly?.precipitationMm?.[0]);
  const c = interpretCloudCover(climate.exoticVariables.cloudCoverPct);
  const hr = interpretHeatRisk(temp, humidity);
  const month = new Date(climate.generatedAt).getMonth();
  const isWarmSeason = month >= 4 && month <= 8;

  const criticalAlarms = alarms.filter(a => a.level === 'critico');
  const warningAlarms = alarms.filter(a => a.level === 'precaucion');

  const agri = weather?.agricultural;

  const actionItems = buildActionItems({
    temp,
    humidity,
    windSpeed,
    windAction: w.action,
    windTone: w.tone,
    heatAction: t.action,
    humidityTone: h.tone,
    humidityAction: h.action,
    heatRiskAction: hr.action,
    heatRiskTone: hr.tone,
    nowcast,
    isWarmSeason,
  });

  const shareText = [
    `🌤️ Meteo Huéscar`,
    `${fmtN(temp, 1)}°C · ${weatherCodeDescription(wcode)} ${weatherEmoji(wcode)}`,
    `💧 ${humidity != null ? humidity.toFixed(0) : '--'}% · 💨 ${windSpeed.toFixed(0)} km/h`,
    t.label,
    agri?.frostRisk48h && agri.frostRisk48h !== 'none' ? `❄️ Riesgo helada: ${agri.frostRisk48h}` : '',
    agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 ? `🚿 Riego: ${agri.recommendedIrrigationLitersM2.toFixed(1)} L/m²` : '',
    '',
    'meteohuescar.es',
  ].filter(Boolean).join('\n');

  const shareOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">
            Meteo Huéscar
            {updateAge != null && (
            <span className="ml-2 font-normal text-slate-600">
              · actualizado hace {updateAge < 60 ? `${updateAge} min` : `${Math.floor(updateAge / 60)}h`}
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={shareOnWhatsApp}
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
          aria-label="Compartir por WhatsApp"
        >
          📤 Compartir
        </button>
      </div>

        <section className={`relative overflow-hidden rounded-[24px] bg-gradient-to-br ${thermalBg(temp)} text-white shadow-xl ring-1 ring-white/15`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_32%)]" />
        <div className="relative px-5 py-5">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">Huéscar ahora</p>
              <p className="mt-1 text-5xl font-black tracking-tight" style={{ color: tempColor(temp) }}>
                {fmtN(temp, 1)}°C
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg">{weatherEmoji(wcode)} {weatherCodeDescription(wcode)}</p>
              <p className="mt-0.5 text-sm text-white/90">Sensación {fmtN(temp, 1)}°C</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/85">
            <span>💧 {humidity != null ? `${humidity.toFixed(0)}%` : '--'}</span>
            <span>💨 {windSpeed.toFixed(0)} km/h {windDir != null ? windDirection(windDir) : ''}{windGust != null ? ` (ráf. ${windGust.toFixed(0)})` : ''}</span>
          </div>
        </div>
      </section>

      {(criticalAlarms.length > 0 || warningAlarms.length > 0) && (
        <section className="rounded-[20px] border border-rose-200 bg-rose-50/90 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">🔔 Activo</p>
          {criticalAlarms.slice(0, 3).map((a, i) => (
            <p key={i} className="mt-1.5 text-sm font-bold text-rose-800">🚨 {a.title}</p>
          ))}
          {warningAlarms.slice(0, 2).map((a, i) => (
            <p key={i} className="mt-1 text-sm font-semibold text-orange-700">⚠️ {a.title}</p>
          ))}
          {alarms.length > 3 && (
            <p className="mt-1.5 text-xs font-bold text-slate-700">+{alarms.length - 3} más · Ver Alertas</p>
          )}
        </section>
      )}

      <section className="rounded-[20px] border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Resumen de hoy</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard icon="🌡️" label={t.label} tone={t.tone} />
          <SummaryCard icon="💧" label={h.label} tone={h.tone} />
          <SummaryCard
            icon="🌱"
            label={agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 ? 'Revisar riego' : 'Riego sin cambios'}
            tone={agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 ? 'warning' : 'success'}
          />
        </div>
        <details className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80">
          <summary className="cursor-pointer px-4 py-3 text-sm font-black text-slate-800">Ver detalle técnico</summary>
          <div className="space-y-4 px-4 pb-4">
            <section className="rounded-[20px] border border-slate-200 bg-white p-5">
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Lo importante hoy</h2>
              <div className="space-y-2.5">
                <Item icon={c.emoji} label={c.label} tone={c.tone} />
                <Item icon="🌡️" label={t.label} tone={t.tone} />
                <Item icon="💧" label={h.label} tone={h.tone} />
                <Item icon="💨" label={w.label} tone={w.tone} />
                <Item icon="☔" label={r.label} tone={r.tone} />
                {hr.tone !== 'success' && <Item icon="🔥" label={hr.label} tone={hr.tone} />}
                {nowcast && nowcast.level !== 'ninguno' && (
                  <Item icon="⛈️" label={nowcast.stormDetected ? 'Tormenta detectada' : 'Lluvia inminente'} tone={nowcast.level === 'peligro' ? 'danger' : 'warning'} />
                )}
              </div>
            </section>

            <section className={`rounded-[20px] border p-5 ${t.tone === 'danger' || t.tone === 'warning' ? 'border-orange-200 bg-orange-50/80' : 'border-emerald-200 bg-emerald-50/80'}`}>
              <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">Qué hacer</h2>
              <div className="space-y-2">
                {actionItems.map((item) => (
                  <div key={item.label} className="flex items-start gap-2">
                    <span className={`mt-0.5 inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${item.tone === 'danger' ? 'bg-rose-100 text-rose-800' : item.tone === 'warning' ? 'bg-amber-100 text-amber-800' : item.tone === 'info' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {item.label}
                    </span>
                    <p className="text-sm leading-6 text-slate-900">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            {agri && (
              <section className="rounded-[20px] border border-sky-200 bg-white p-5">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">🌾 Campo</h2>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  {agri.et0CumulativeMm != null && (
                    <span className="text-slate-700">💧 ET0 semanal <strong className="text-sky-800">{fmtN(agri.et0CumulativeMm, 1)} mm</strong></span>
                  )}
                  {agri.frostRisk48h && agri.frostRisk48h !== 'none' && (
                    <span className="text-slate-700">❄️ Helada <strong className="text-rose-700">{agri.frostRisk48h}</strong></span>
                  )}
                  {agri.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 && (
                    <span className="text-slate-700">🚿 Riego <strong className="text-sky-800">{agri.recommendedIrrigationLitersM2.toFixed(1)} L/m²</strong></span>
                  )}
                  {agri.frostRisk48h === 'none' && (
                    <span className="text-emerald-700">✅ Sin riesgo de helada</span>
                  )}
                </div>
              </section>
            )}

            {weather?.livestock && (
              <section className="rounded-[20px] border border-amber-200 bg-white p-5">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-700">🐄 Ganadería</h2>
                <p className="mt-2 text-sm font-semibold text-amber-800">
                  {interpretTHI(weather.livestock.thi ?? null).label}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {interpretTHI(weather.livestock.thi ?? null).action}
                </p>
              </section>
            )}
          </div>
        </details>

        <section className="rounded-[22px] border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💡</span>
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Consejos para hoy</h2>
          </div>
          <div className="space-y-3">
            {[
              temp >= 32 && '🌡️ Evita el sol directo entre 12:00 y 18:00. Mantente hidratado.',
              temp <= 3 && '❄️ Abrígate bien y protege plantas o tuberías sensibles.',
              humidity !== null && humidity <= 25 && '💧 El ambiente está muy seco. Bebe más agua de lo normal.',
              windSpeed > 30 && '💨 Viento fuerte. Asegura objetos sueltos en terrazas y jardines.',
              windSpeed <= 15 && '🌿 Buen momento para tratamientos agrícolas si no hay lluvia prevista.',
              agri?.frostRisk48h && agri.frostRisk48h !== 'none' && '❄️ Riesgo de helada. Protege cultivos sensibles.',
              agri?.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0 && '🚿 Revisa la humedad del suelo antes de regar.',
              weather?.livestock?.thi != null && weather.livestock.thi >= 72 && '🐄 Vigila al ganado: proporciona sombra y agua fresca.',
              agri?.workability?.workable === false && '🌾 Evita labores pesadas: el suelo no está en condiciones.',
            ].filter(Boolean).map((tip, i) => (
              <p key={i} className="text-sm leading-6 text-slate-800">{tip}</p>
            ))}
          </div>
          {agri && (
            <a
              href="/huescar/campo"
              className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
            >
              🌾 Ver detalle Campo
            </a>
          )}
        </section>
      </section>
    </div>
  );
}

function Item({ icon, label, tone }: { icon: string; label: string; tone: string }) {
  const color = tone === 'danger' ? 'text-red-800' : tone === 'warning' ? 'text-orange-800' : tone === 'success' ? 'text-emerald-800' : 'text-slate-800';
  return (
    <div className="flex items-center gap-3">
      <span className="text-base">{icon}</span>
      <p className={`text-sm font-bold ${color}`}>{label}</p>
    </div>
  );
}

function ageFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round(ms / 60000));
}

function buildActionItems({
  temp,
  humidity,
  windSpeed,
  windAction,
  windTone,
  heatAction,
  humidityTone,
  humidityAction,
  heatRiskAction,
  heatRiskTone,
  nowcast,
  isWarmSeason,
}: {
  temp: number;
  humidity: number | null;
  windSpeed: number;
  windAction: string;
  windTone: string;
  heatAction: string;
  humidityTone: string;
  humidityAction: string;
  heatRiskAction: string;
  heatRiskTone: string;
  nowcast: WeatherPayload['nowcast'] | undefined;
  isWarmSeason: boolean;
  }): { label: 'Hoy' | 'Haz' | 'Evita'; text: string; tone: 'default' | 'info' | 'warning' | 'danger' | 'success' }[] {
  const items: { label: 'Hoy' | 'Haz' | 'Evita'; text: string; tone: 'default' | 'info' | 'warning' | 'danger' | 'success' }[] = [];

  if (temp >= 32) {
    items.push({
      label: 'Hoy',
      text: humidity != null && humidity >= 55
        ? 'Calor fuerte con bochorno.'
        : 'Calor fuerte y seco.' ,
      tone: 'warning',
    });
    items.push({
      label: 'Haz',
      text: 'Bebe agua, busca sombra y adelanta las tareas más duras a primera hora o al atardecer.',
      tone: 'danger',
    });
    items.push({
      label: 'Evita',
      text: 'Trabajar al sol entre las 12:00 y las 18:00 y dejar animales o personas dentro del coche.',
      tone: 'danger',
    });
  } else if (temp >= 22) {
    items.push({
      label: 'Hoy',
      text: 'Día agradable para estar fuera y trabajar en el campo.',
      tone: 'success',
    });
    items.push({
      label: 'Haz',
      text: 'Aprovecha la mañana para labores, riego o tratamientos ligeros.',
      tone: 'info',
    });
    items.push({
      label: 'Evita',
      text: 'Solo el sol fuerte del mediodía si vas a hacer esfuerzo prolongado.',
      tone: 'info',
    });
  } else if (isWarmSeason) {
    items.push({
      label: 'Hoy',
      text: 'Temperatura suave para verano, sin riesgo de calor fuerte.',
      tone: 'success',
    });
    items.push({
      label: 'Haz',
      text: 'Mantén el riego normal y aprovecha para labores menos exigentes.',
      tone: 'info',
    });
    items.push({
      label: 'Evita',
      text: 'Exponerte demasiado al sol si la humedad baja y sube la deshidratación.',
      tone: 'warning',
    });
  } else {
    items.push({
      label: 'Hoy',
      text: temp <= 3 ? 'Frío con riesgo de helada.' : 'Día fresco, vigila la noche si despeja.',
      tone: temp <= 3 ? 'danger' : 'info',
    });
    items.push({
      label: 'Haz',
      text: temp <= 3
        ? 'Protege cultivos sensibles y revisa tuberías, bebederos y animales.'
        : 'Abrígate y aprovecha la luz del día para labores cortas.',
      tone: temp <= 3 ? 'danger' : 'info',
    });
    items.push({
      label: 'Evita',
      text: temp <= 3
        ? 'Riego o tratamientos que puedan congelarse de madrugada.'
        : 'Quedarte quieto demasiado tiempo al aire libre sin abrigo.',
      tone: temp <= 3 ? 'warning' : 'info',
    });
  }

  if ((windTone === 'danger' || windTone === 'warning') && windAction) {
    items[1] = {
      label: 'Haz',
      text: windAction,
      tone: windTone as 'warning' | 'danger',
    };
  }

  if (nowcast && nowcast.level !== 'ninguno') {
    items.push({
      label: 'Evita',
      text: nowcast.stormDetected
        ? 'Trabajos al aire libre: hay tormenta detectada.'
        : 'Labores sensibles: hay lluvia inminente.',
      tone: nowcast.level === 'peligro' ? 'danger' : 'warning',
    });
  }

  if (items.length > 3) return items.slice(0, 3);
  return items;
}

function SummaryCard({ icon, label, tone }: { icon: string; label: string; tone: string }) {
  const border = tone === 'danger' ? 'border-rose-200 bg-rose-50' : tone === 'warning' ? 'border-amber-200 bg-amber-50' : tone === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50';
  const text = tone === 'danger' ? 'text-rose-800' : tone === 'warning' ? 'text-amber-800' : tone === 'success' ? 'text-emerald-800' : 'text-slate-800';
  return (
    <div className={`rounded-2xl border p-4 ${border}`}>
      <p className="text-2xl">{icon}</p>
      <p className={`mt-2 text-sm font-black ${text}`}>{label}</p>
    </div>
  );
}
