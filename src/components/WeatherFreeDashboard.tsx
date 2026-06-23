'use client';

import Link from 'next/link';
import { useWeatherData } from '@/hooks/useWeatherData';
import RadarPanel from '@/components/RadarPanel';
import {
  dayLabel,
  temperatureColor,
  weatherCodeDescription,
  weatherEmoji,
  windDirection,
} from '@/lib/display';
import type { DailyWeather, HourlyWeather, WeatherAlert, WeatherPayload } from '@/types/weather';

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function comfortLabel(apparentTemperatureC: number) {
  if (apparentTemperatureC <= -2) return 'Frio intenso';
  if (apparentTemperatureC < 7) return 'Frio';
  if (apparentTemperatureC < 18) return 'Fresco';
  if (apparentTemperatureC < 28) return 'Confortable';
  if (apparentTemperatureC < 36) return 'Calor';
  return 'Calor extremo';
}

function nextHours(hourly: HourlyWeather, referenceTimeIso?: string) {
  const now = referenceTimeIso ? new Date(referenceTimeIso).getTime() : Date.now();
  return hourly.time
    .map((time, index) => ({
      time,
      index,
      timestamp: new Date(time).getTime(),
    }))
    .filter((item) => item.timestamp >= now)
    .slice(0, 8);
}

function AlertsMini({ alerts }: { alerts: WeatherAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
        <p className="text-xs font-bold uppercase tracking-[0.18em]">Avisos</p>
        <p className="mt-2 text-xl font-bold">Sin avisos activos</p>
        <p className="mt-1 text-sm text-emerald-800/80">Situacion tranquila para Huéscar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <p className="text-xs font-bold uppercase tracking-[0.18em]">Avisos</p>
      <p className="mt-2 text-xl font-bold">{alerts.length} aviso(s) activo(s)</p>
      <div className="mt-3 space-y-2">
        {alerts.slice(0, 2).map((alert, index) => (
          <div key={`${alert.title}-${index}`} className="rounded-2xl bg-white/70 p-3">
            <p className="text-sm font-bold">{alert.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-amber-900/80">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FreeHourlyStrip({ hourly, referenceTimeIso }: { hourly: HourlyWeather; referenceTimeIso?: string }) {
  const hours = nextHours(hourly, referenceTimeIso);

  return (
    <section className="surface-card rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Proximas horas</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">Vista rapida</h2>
        </div>
        <p className="text-sm text-slate-500">Version gratuita limitada a las proximas horas.</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hours.map(({ time, index }) => (
          <article key={time} className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">{formatHour(time)}</p>
              <span className="text-2xl">{weatherEmoji(hourly.weatherCode[index] ?? 0)}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-950">{(hourly.temperatureC[index] ?? 0).toFixed(1)}°C</p>
            <p className="mt-1 text-sm text-slate-600">Lluvia {(hourly.precipitationProbabilityPct[index] ?? 0).toFixed(0)}%</p>
            <p className="text-sm text-slate-600">Viento {(hourly.windSpeedKmh[index] ?? 0).toFixed(0)} km/h</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function FreeDailyCards({ daily }: { daily: DailyWeather }) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {daily.time.slice(0, 3).map((time, index) => (
        <article key={time} className="surface-card rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">{dayLabel(time)}</p>
              <h3 className="mt-2 text-xl font-bold text-slate-950">{weatherCodeDescription(daily.weatherCode[index] ?? 0)}</h3>
            </div>
            <span className="text-4xl">{weatherEmoji(daily.weatherCode[index] ?? 0)}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-slate-500">Max / min</p>
              <p className="mt-1 font-bold text-slate-950">
                {(daily.temperatureMaxC[index] ?? 0).toFixed(0)}° / {(daily.temperatureMinC[index] ?? 0).toFixed(0)}°
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-slate-500">Lluvia</p>
              <p className="mt-1 font-bold text-slate-950">{(daily.precipitationProbabilityPct[index] ?? 0).toFixed(0)}%</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function MicroclimateCard({ data }: { data: WeatherPayload }) {
  const items = [
    {
      icon: '⛰️',
      label: 'Altitud corregida',
      detail: `${data.elevation.toFixed(0)} m`,
      caption: 'El dato se ajusta a la altitud real del casco urbano, no a la de la estación (1101 m).',
    },
    {
      icon: '🌊',
      label: 'Embalse San Clemente',
      detail: 'A 0.28 km',
      caption: 'La estación está junto al embalse. Corregimos su influencia en temperatura y humedad.',
    },
    {
      icon: '🌙',
      label: 'Inversión nocturna',
      detail: data.current.temperatureC <= 5 ? 'Activa esta noche' : 'Sin inversión ahora',
      caption: data.current.temperatureC <= 5
        ? 'El aire frío baja a la vega. Puede haber 4-5°C menos que en el casco urbano.'
        : 'Temperatura suave. La inversión nocturna no es relevante ahora.',
    },
  ];

  return (
    <section className="surface-card-strong overflow-hidden rounded-[28px]">
      <div className="bg-[linear-gradient(135deg,#11253f,#1c426c)] px-5 py-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200">Microclima local</p>
        <h2 className="mt-1 text-lg font-bold text-white">Factores que ninguna app general corrige</h2>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
        {items.map((item) => (
          <div key={item.label} className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm font-bold text-slate-900">{item.label}</p>
                <p className="text-xs font-semibold text-sky-700">{item.detail}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-600">{item.caption}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function WeatherFreeDashboard() {
  const { data, error, loading, refresh } = useWeatherData('meteo-free-dashboard');
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = data
    ? `Tiempo en ${data.location}: ${data.current.temperatureC.toFixed(1)}°C, ${weatherCodeDescription(data.current.weatherCode)}.`
    : 'Tiempo local de Huéscar.';
  const shareHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const rainToday = data?.daily.precipitationProbabilityPct[0] ?? 0;
  const freeSummary = data
    ? `Hoy: ${weatherCodeDescription(data.current.weatherCode).toLowerCase()}, lluvia ${rainToday.toFixed(0)}% y rachas de hasta ${data.current.windGustKmh.toFixed(0)} km/h.`
    : '';

  if (loading) {
    return (
      <div className="surface-card flex min-h-[360px] items-center justify-center rounded-[28px] p-12">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card rounded-[28px] p-10 text-center">
        <p className="font-semibold text-red-500">Error al cargar el tiempo</p>
        <p className="mt-2 text-sm text-slate-500">{error.message}</p>
        <button type="button" onClick={refresh} className="mt-5 rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const hours = nextHours(data.hourly, data.current.time);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-slate-950 text-white shadow-2xl">
        <div className="relative px-5 py-7 sm:px-8 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_46%),linear-gradient(135deg,rgba(15,23,42,1),rgba(30,64,175,0.72))]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-sky-100">
                Version publica gratuita
              </p>
              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">El tiempo local de Huéscar</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-100/85">
                Informacion rapida para vecinos, campo, ganaderia, turismo y actividades al aire libre. Datos completos y alertas avanzadas disponibles en versiones Pro o institucionales.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={shareHref} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-50">
                  Compartir por WhatsApp
                </a>
                <a href="mailto:?subject=Patrocinar Meteo Huéscar&body=Quiero informacion para patrocinar el servicio meteorologico local de Huéscar." className="rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15">
                  Patrocinar este servicio
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-4">
                <span className="text-6xl">{weatherEmoji(data.current.weatherCode)}</span>
                <div>
                  <p className="text-5xl font-black" style={{ color: temperatureColor(data.current.temperatureC) }}>
                    {data.current.temperatureC.toFixed(1)}°C
                  </p>
                  <p className="mt-1 text-sm text-slate-100/80">
                    Sensacion {data.current.apparentTemperatureC.toFixed(1)}°C · {comfortLabel(data.current.apparentTemperatureC)}
                  </p>
                </div>
              </div>
              <p className="mt-5 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-slate-100">{freeSummary}</p>
              <p className="mt-4 text-xs text-slate-300">Actualizado {formatUpdatedAt(data.fetchedAt)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="surface-card rounded-[24px] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Lluvia hoy</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{rainToday.toFixed(0)}%</p>
          <p className="mt-1 text-sm text-slate-600">Probabilidad diaria base.</p>
        </div>
        <div className="surface-card rounded-[24px] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Viento</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{data.current.windSpeedKmh.toFixed(0)} km/h</p>
          <p className="mt-1 text-sm text-slate-600">{windDirection(data.current.windDirectionDeg)} · rachas {data.current.windGustKmh.toFixed(0)} km/h</p>
        </div>
        <div className="surface-card rounded-[24px] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Humedad</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{data.current.humidityPct.toFixed(0)}%</p>
          <p className="mt-1 text-sm text-slate-600">Ambiente actual.</p>
        </div>
        <AlertsMini alerts={data.alerts} />
      </section>

      <FreeHourlyStrip hourly={data.hourly} referenceTimeIso={data.current.time} />
      <FreeDailyCards daily={data.daily} />
      <MicroclimateCard data={data} />

      <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <RadarPanel radar={data.radar} variant="neutral" />

        <aside className="surface-card-strong rounded-[28px] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Version Pro</p>
          <h2 className="mt-3 text-2xl font-black text-slate-950">Datos avanzados para campo y ganaderia</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            La version gratuita mantiene la informacion esencial. La capa profesional puede incluir alertas de helada, granizo, acumulados de lluvia, historicos, miniestaciones y avisos personalizados.
          </p>
          <div className="mt-5 grid gap-3 text-sm text-slate-700">
            <div className="rounded-2xl bg-white p-3 font-semibold">Alertas por zona o finca</div>
            <div className="rounded-2xl bg-white p-3 font-semibold">Historico y acumulados por campaña</div>
            <div className="rounded-2xl bg-white p-3 font-semibold">Miniestaciones locales propias</div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="mailto:?subject=Informacion Meteo Huéscar Pro&body=Quiero informacion sobre la version Pro agricola/ganadera." className="cta-primary">
              Solicitar version Pro
            </a>
            <Link href="/meteo" className="cta-secondary">
              Ver panel completo
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
