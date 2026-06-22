'use client';

import { temperatureColor, weatherCodeDescription, weatherEmoji, windDirection } from '@/lib/display';
import { OverviewMetric } from '@/components/dashboard/atoms';
import { AlertDropdown, SourceHealthRow } from '@/components/dashboard/health-and-alerts';
import type { NowcastData, RadarData, WeatherPayload } from '@/types/weather';

function CompactRainCard({ nowcast, radar }: { nowcast?: NowcastData; radar?: RadarData }) {
  if (nowcast && nowcast.minutesToRain !== null) {
    return <OverviewMetric label="Lluvia" value={`${nowcast.minutesToRain} min`} caption="Inicio estimado de precipitacion" tone="warning" />;
  }

  if (radar && radar.level !== 'ninguno') {
    return <OverviewMetric label="Radar" value={radar.level} caption="Actividad regional detectada" tone="warning" />;
  }

  return <OverviewMetric label="Lluvia" value="Sin aviso" caption="Sin señal inmediata en radar/nowcast" tone="accent" />;
}

export function HeroPanel({ data }: { data: WeatherPayload }) {
  const todayRainProbability = data.daily.precipitationProbabilityPct[0];
  const todayRainProbabilityLabel = typeof todayRainProbability === 'number' && Number.isFinite(todayRainProbability)
    ? `${todayRainProbability.toFixed(0)}%`
    : '—';
  const alertSummary = data.alerts.length > 0 ? `${data.alerts.length} activas` : 'Sin alertas';
  const confidenceTone = data.confidencePct >= 70 ? 'accent' : data.confidencePct >= 50 ? 'default' : 'warning';

  return (
    <div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(17,37,63,0.98),rgba(28,66,108,0.95),rgba(45,127,249,0.88))] px-5 py-6 text-white sm:px-7 sm:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <span className="eyebrow border-white/10 bg-white/10 text-sky-100">Resumen local</span>
          <h2 className="mt-5 text-3xl font-bold sm:text-4xl">{data.location}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-100/88">
            Estado actual, proximas horas y avisos relevantes para decidir rapido sin entrar en detalle tecnico.
          </p>
          <div className="mt-5 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-4">
              <span className="text-6xl">{weatherEmoji(data.current.weatherCode)}</span>
              <div>
                <p className="text-5xl font-bold" style={{ color: temperatureColor(data.current.temperatureC) }}>
                  {data.current.temperatureC.toFixed(1)}°C
                </p>
                <p className="mt-1 text-sm text-slate-100/78">
                  Sensacion {data.current.apparentTemperatureC.toFixed(1)}°C · {weatherCodeDescription(data.current.weatherCode)}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <SourceHealthRow health={data.sourceHealth} />
          </div>
        </div>
        <div className="flex flex-col items-start gap-3">
          <AlertDropdown alerts={data.alerts} variant="neutral" />
          <div className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-slate-50">
            Actualizado {new Date(data.fetchedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-4">
        <OverviewMetric label="Humedad" value={`${data.current.humidityPct.toFixed(0)}%`} caption="Ambiente actual" />
        <OverviewMetric
          label="Viento"
          value={`${data.current.windSpeedKmh.toFixed(0)} km/h`}
          caption={windDirection(data.current.windDirectionDeg)}
        />
        <CompactRainCard nowcast={data.nowcast} radar={data.radar} />
        <OverviewMetric
          label="Confianza"
          value={`${data.confidencePct.toFixed(0)}%`}
          caption={alertSummary}
          tone={confidenceTone}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="metric-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Lectura operativa</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Lo que importa ahora</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Precipitacion hoy</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{data.current.precipitationMm.toFixed(1)} mm</p>
              <p className="mt-1 text-sm text-slate-600">Acumulado actual</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Prob. lluvia</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{todayRainProbabilityLabel}</p>
              <p className="mt-1 text-sm text-slate-600">Prevision diaria base</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Rafagas</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{data.current.windGustKmh.toFixed(0)} km/h</p>
              <p className="mt-1 text-sm text-slate-600">Pico actual estimado</p>
            </div>
          </div>
        </div>

        <div className="metric-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Modelo meteorologico</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Confianza del dato</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Fusion activa</p>
              <p className="mt-1">Dato principal consolidado desde fuentes publicas y red local.</p>
            </div>
            <div className="rounded-[20px] bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Detalle bajo demanda</p>
              <p className="mt-1">Radar y transparencia quedan en la pestaña tecnica para no saturar la lectura principal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
