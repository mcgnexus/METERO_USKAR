'use client';

import { ageFromIso, fmtN } from '@/components/llano/atoms';
import { weatherCodeDescription, weatherEmoji, windDirection } from '@/lib/display';
import type { ClimateCalibrationPayload } from '@/hooks/useClimateCalibration';
import type { WeatherPayload } from '@/types/weather';

function tempColor(t: number): string {
  if (t <= 0) return '#60a5fa';
  if (t <= 10) return '#22d3ee';
  if (t <= 20) return '#34d399';
  if (t <= 30) return '#fbbf24';
  if (t <= 35) return '#f97316';
  return '#ef4444';
}

function dewPointC(tempC: number | null | undefined, rhPct: number | null | undefined): number | null {
  if (tempC === null || tempC === undefined || rhPct === null || rhPct === undefined || rhPct <= 0) return null;
  const a = 17.62;
  const b = 243.12;
  const gamma = Math.log(rhPct / 100) + (a * tempC) / (b + tempC);
  return (b * gamma) / (a - gamma);
}

function apparentTemperatureC(tempC: number, rhPct: number | null | undefined, windKmh: number | null | undefined): number {
  if (tempC <= 10 && windKmh !== null && windKmh !== undefined && windKmh > 4.8) {
    return 13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKmh, 0.16) + 0.3965 * tempC * Math.pow(windKmh, 0.16);
  }

  if (tempC >= 27 && rhPct !== null && rhPct !== undefined && rhPct >= 40) {
    const t = tempC * 9 / 5 + 32;
    const hi = -42.379 + 2.04901523 * t + 10.14333127 * rhPct - 0.22475541 * t * rhPct - 0.00683783 * t * t - 0.05481717 * rhPct * rhPct + 0.00122874 * t * t * rhPct + 0.00085282 * t * rhPct * rhPct - 0.00000199 * t * t * rhPct * rhPct;
    return (hi - 32) * 5 / 9;
  }

  return tempC;
}

function cloudLabel(cloudCoverPct: number | null | undefined): string {
  if (cloudCoverPct === null || cloudCoverPct === undefined) return 'Cielo actual no disponible';
  if (cloudCoverPct < 15) return '☀️ Despejado';
  if (cloudCoverPct < 45) return '🌤️ Claros';
  if (cloudCoverPct < 75) return '⛅ Nuboso variable';
  return '☁️ Cubierto';
}

export function PulseHero({ climate, weather, alarmCount }: {
  climate: ClimateCalibrationPayload;
  weather: WeatherPayload | null;
  alarmCount: number;
}) {
  const local = climate.nodes.localStation;
  const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const humidity = local?.humidityPct ?? climate.extrapolation.humidityPct ?? climate.eto.inputs.humidityPct ?? weather?.current?.humidityPct;
  const localWindSpeed = climate.nodes.radiationWind.windSpeed2mKmh;
  const dew = climate.dewPoint.dewPointC ?? dewPointC(temp, humidity);
  const feelsLike = apparentTemperatureC(temp, humidity, localWindSpeed);

  const current = weather?.current;
  const windSpeed = localWindSpeed;
  const windDir = climate.extrapolation.bazaWindDirectionDeg ?? current?.windDirectionDeg ?? null;
  const windGust = current?.windGustKmh !== undefined
    ? current.windGustKmh * climate.microclimate.windGustReductionFactor
    : null;
  const wcode = current?.weatherCode ?? 0;
  const sky = current ? `${weatherEmoji(wcode)} ${weatherCodeDescription(wcode)}` : cloudLabel(climate.exoticVariables.cloudCoverPct);

  const localAge = ageFromIso(local?.time ?? null);
  const isLocalLive = local?.status === 'OK' && localAge !== null && localAge < 180;
  const isLocalStale = local !== null && !isLocalLive;

  const updateAge = ageFromIso(climate.generatedAt);

  return (
    <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 text-white shadow-2xl">
      <div className="relative px-5 py-7 sm:px-8 sm:py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_46%),linear-gradient(135deg,rgba(15,23,42,1),rgba(30,64,175,0.72))]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div>
            <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-100">
              Meteo Huéscar
            </p>
            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              Meteo Huéscar
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100/85">
              Previsión local, lluvia, viento, frío, calor, alertas y consejos útiles para vecinos, campo y actividades al aire libre.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#alertas-aemet" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-50">
                Ver alertas AEMET
              </a>
              <a href="#proximas-24h" className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                Ver 24h detalladas
              </a>
            </div>
          </div>

          <div className="space-y-4">
            {alarmCount > 0 && (
              <div className="flex items-center justify-between rounded-[20px] border border-rose-500/30 bg-rose-500/15 px-4 py-2.5">
                <span className="text-sm font-bold text-rose-100">🚨 {alarmCount} {alarmCount === 1 ? 'alarma activa' : 'alarmas activas'}</span>
                <a href="#alarmas" className="rounded-full bg-rose-500/25 px-3 py-1 text-xs font-bold text-rose-100 transition hover:bg-rose-500/40">
                  Ver
                </a>
              </div>
            )}
            <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">Dato local calibrado</p>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-5xl font-black" style={{ color: tempColor(temp ?? 0) }}>
                    {fmtN(temp, 1)}°C
                  </p>
                </div>
                <div className="text-right text-sm text-slate-100/80">
                  <p>Sensación {fmtN(feelsLike, 1)}°C</p>
                  <p className="mt-0.5">Humedad {fmtN(humidity, 0)}%</p>
                </div>
              </div>
              <p className="mt-4 text-5xl font-black leading-tight text-slate-50">
                {sky}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white/10 p-3 text-sm text-slate-100/80">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Viento local 2m</p>
                  <p className="mt-0.5">
                    {`${windSpeed.toFixed(0)} km/h ${windDir !== null ? windDirection(windDir) : ''}`}
                    {windGust !== null ? <span className="text-slate-400"> ráf. {windGust.toFixed(0)}</span> : null}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Punto rocío</p>
                  <p className="mt-0.5">{fmtN(dew, 1)}°C</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-300">
                {isLocalLive
                  ? 'Dato en vivo desde tu miniestación'
                  : climate.microclimate.inversionConditions
                    ? `Inversión térmica · drenaje ${climate.microclimate.coldAirDrainageC.toFixed(1)}°C`
                    : isLocalStale
                      ? 'Sensor sin lecturas frescas. Modelo calibrado activo.'
                      : 'Estimación calibrada AEMET Baza + Huéscar/San Clemente'}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {updateAge !== null
                    ? `Actualizado hace ${updateAge < 60 ? `${updateAge} min` : `${Math.floor(updateAge / 60)}h`}`
                    : 'Sin timestamp'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
