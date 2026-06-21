'use client';

import { useState } from 'react';
import type { WeatherAlert, WeatherPayload } from '@/types/weather';

function levelTone(level: string): string {
  if (level === 'peligro' || level === 'severo') return 'border-rose-200 bg-rose-50 text-rose-950';
  if (level === 'alerta' || level === 'peligro') return 'border-orange-200 bg-orange-50 text-orange-950';
  if (level === 'precaucion' || level === 'aviso') return 'border-amber-200 bg-amber-50 text-amber-950';
  return 'border-sky-200 bg-sky-50 text-sky-950';
}

function levelBadgeTone(level: string): string {
  if (level === 'peligro' || level === 'severo') return 'bg-rose-600 text-white';
  if (level === 'alerta') return 'bg-orange-500 text-white';
  if (level === 'precaucion' || level === 'aviso') return 'bg-amber-400 text-amber-950';
  return 'bg-sky-400 text-sky-950';
}

function levelLabel(level: WeatherAlert['level']): string {
  if (level === 'severo') return 'Severo';
  if (level === 'peligro') return 'Peligro';
  return 'Aviso';
}

function levelMeaning(level: WeatherAlert['level']): string {
  if (level === 'severo') return 'Riesgo importante. Conviene actuar y evitar exposición innecesaria.';
  if (level === 'peligro') return 'Riesgo relevante. Preparar medidas preventivas y seguir evolución.';
  return 'Aviso informativo. Mantener vigilancia y revisar la actualización oficial.';
}

function actionText(level: WeatherAlert['level']): string {
  if (level === 'severo') return 'Evitar desplazamientos o trabajos expuestos si no son necesarios. Revisar cultivos, maquinaria, animales, cubiertas, desagües y elementos sueltos.';
  if (level === 'peligro') return 'Planificar con margen. Preparar protección de cultivos sensibles, revisar riego/drenaje y evitar trabajos vulnerables durante la ventana de riesgo.';
  return 'No requiere acción inmediata salvo actividades sensibles. Consultar la evolución si hay trabajos al aire libre, viajes o labores agrícolas previstas.';
}

function AemetAlertModal({ alert, onClose }: { alert: WeatherAlert; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[30px] border p-6 shadow-2xl ${levelTone(alert.level)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Aviso oficial AEMET</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">{alert.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${levelBadgeTone(alert.level)}`}>
                {levelLabel(alert.level)}
              </span>
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-700">
                Fuente oficial AEMET
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/80 px-3 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-white"
            aria-label="Cerrar"
          >
            x
          </button>
        </div>

        <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-rose-300">Lectura rápida</p>
          <p className="mt-2 text-3xl font-black leading-tight">{levelMeaning(alert.level)}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Nivel</p>
            <p className="mt-1 text-xl font-black text-slate-950">{levelLabel(alert.level)}</p>
          </div>
          <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Tipo</p>
            <p className="mt-1 text-xl font-black capitalize text-slate-950">{alert.type || 'Meteorológico'}</p>
          </div>
          <div className="rounded-2xl bg-white/85 p-3 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Ámbito</p>
            <p className="mt-1 text-xl font-black text-slate-950">Comarca</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <section className="rounded-2xl bg-white/85 p-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Mensaje oficial</h3>
            <p className="mt-2 text-lg font-black text-slate-950">{alert.title}</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{alert.message}</p>
          </section>

          <section className="rounded-2xl bg-white/85 p-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Qué implica</h3>
            <p className="mt-2 text-lg font-black text-slate-950">Impacto potencial según nivel oficial</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{levelMeaning(alert.level)}</p>
          </section>

          <section className="rounded-2xl bg-white/85 p-4 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Acción recomendada</h3>
            <p className="mt-2 text-lg font-black text-slate-950">Priorizar seguridad y planificación</p>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{actionText(alert.level)}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function InminenteSection({ weather }: { weather: WeatherPayload | null }) {
  const [expandedAemetAlert, setExpandedAemetAlert] = useState<WeatherAlert | null>(null);

  if (!weather) return null;

  const nowcast = weather.nowcast;
  const radar = weather.radar;
  const aemetAlerts = weather.alerts ?? [];
  const lightning = weather.lightning;

  const hasNowcast = nowcast && (nowcast.level !== 'ninguno' || nowcast.stormDetected);
  const hasRadar = radar && radar.level !== 'ninguno';
  const hasLightning = lightning && lightning.active;
  const hasAemet = aemetAlerts.length > 0;

  if (!hasNowcast && !hasRadar && !hasLightning && !hasAemet) {
    return (
      <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Inminente</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Sin avisos a corto plazo</h2>
            <p className="mt-1 text-sm text-slate-600">No hay lluvia inminente, rayos ni avisos AEMET activos.</p>
          </div>
          <span className="text-3xl">✓</span>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {(hasNowcast || hasRadar) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {hasNowcast && (
            <article className={`rounded-[24px] border p-5 ${levelTone(nowcast!.level)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Nowcast (próximas 2h)</p>
                  <h3 className="mt-1 text-2xl font-black">
                    {nowcast!.minutesToRain !== null ? `Lluvia en ${nowcast!.minutesToRain} min` : 'Sin lluvia inminente'}
                  </h3>
                  <p className="mt-1 text-sm">{nowcast!.message}</p>
                </div>
                {nowcast!.level !== 'ninguno' && (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${levelBadgeTone(nowcast!.level)}`}>
                    {nowcast!.level}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/60 p-3">
                  <p className="text-xs uppercase tracking-[0.12em] opacity-70">Total 2h</p>
                  <p className="mt-1 text-xl font-black">{nowcast!.totalPrecipNext2h.toFixed(1)} mm</p>
                </div>
                {nowcast!.stormDetected && nowcast!.stormDistanceKm !== null && (
                  <div className="rounded-2xl bg-white/60 p-3">
                    <p className="text-xs uppercase tracking-[0.12em] opacity-70">Tormenta</p>
                    <p className="mt-1 text-xl font-black">{nowcast!.stormDistanceKm.toFixed(0)} km</p>
                  </div>
                )}
              </div>
            </article>
          )}
          {hasRadar && (
            <article className={`rounded-[24px] border p-5 ${levelTone(radar!.level)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em]">Radar regional</p>
                  <h3 className="mt-1 text-2xl font-black">Actividad {radar!.level}</h3>
                  <p className="mt-1 text-sm">{radar!.message}</p>
                </div>
                {radar!.level !== 'ninguno' && (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${levelBadgeTone(radar!.level)}`}>
                    {radar!.level}
                  </span>
                )}
              </div>
              {radar!.minutesToRain !== null && (
                <p className="mt-3 text-sm font-bold">Lluvia estimada en tu zona en {radar!.minutesToRain} min</p>
              )}
            </article>
          )}
        </div>
      )}

      {hasLightning && (
        <article className={`rounded-[24px] border p-5 ${levelTone(lightning!.level)}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em]">Actividad eléctrica</p>
              <h3 className="mt-1 text-xl font-black">{lightning!.message}</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${levelBadgeTone(lightning!.level)}`}>
              {lightning!.level}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/60 p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.12em] opacity-70">Rayos detectados</p>
              <p className="mt-1 text-xl font-black">{lightning!.strikeCount}</p>
            </div>
            {lightning!.nearestStrikeKm !== null && (
              <div className="rounded-2xl bg-white/60 p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.12em] opacity-70">Rayo más cercano</p>
                <p className="mt-1 text-xl font-black">{lightning!.nearestStrikeKm.toFixed(1)} km</p>
              </div>
            )}
          </div>
        </article>
      )}

      {hasAemet && (
        <article id="alertas-aemet" className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-rose-950">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-700">Avisos oficiales AEMET</p>
          <h3 className="mt-1 text-xl font-black">{aemetAlerts.length} aviso(s) activo(s) en la comarca</h3>
          <div className="mt-3 space-y-2">
            {aemetAlerts.slice(0, 3).map((a, i) => (
              <button
                key={i}
                type="button"
                className="block w-full rounded-2xl bg-white/70 p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
                onClick={() => setExpandedAemetAlert(a)}
              >
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${levelBadgeTone(a.level)}`}>
                    {a.level}
                  </span>
                  <p className="text-sm font-bold">{a.title}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-rose-900/90">{a.message}</p>
              </button>
            ))}
          </div>
        </article>
      )}

      {expandedAemetAlert && (
        <AemetAlertModal alert={expandedAemetAlert} onClose={() => setExpandedAemetAlert(null)} />
      )}
    </section>
  );
}
