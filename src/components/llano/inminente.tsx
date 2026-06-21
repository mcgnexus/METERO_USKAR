'use client';

import type { WeatherPayload } from '@/types/weather';

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

export function InminenteSection({ weather }: { weather: WeatherPayload | null }) {
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
        <div className="grid gap-4 lg:grid-cols-2">
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
              <div key={i} className="rounded-2xl bg-white/70 p-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${levelBadgeTone(a.level)}`}>
                    {a.level}
                  </span>
                  <p className="text-sm font-bold">{a.title}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-rose-900/90">{a.message}</p>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
