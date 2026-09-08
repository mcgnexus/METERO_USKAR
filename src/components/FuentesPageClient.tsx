'use client';

import Link from 'next/link';
import { NavBottom } from '@/components/NavBottom';
import { UpdatedAtNote } from '@/components/common/UpdatedAtNote';
import { fmtDateHourMadrid, ageDisplay, ageMinutes } from '@/lib/timezone';
import { useClientNow } from '@/hooks/useClientNow';
import { primarySourceLabel } from '@/lib/dataQuality';
import { anyAttention, effectiveQualityLabel } from '@/lib/sourceValidity';
import type { DataSource, HuescarWeatherResponse } from '@/types/weather-response';

const STATUS_STYLES: Record<DataSource['status'], { dot: string; label: string; badge: string; border: string; text: string }> = {
  active: {
    dot: 'bg-emerald-500',
    label: 'Activa',
    badge: 'bg-emerald-100 text-emerald-800',
    border: 'border-emerald-200',
    text: 'Datos actuales',
  },
  stale: {
    dot: 'bg-amber-400',
    label: 'Desactualizada',
    badge: 'bg-amber-100 text-amber-800',
    border: 'border-amber-300',
    text: '⚠️ Datos desactualizados',
  },
  unavailable: {
    dot: 'bg-red-500',
    label: 'No disponible',
    badge: 'bg-red-100 text-red-700',
    border: 'border-red-300',
    text: '🚫 Esta fuente no responde',
  },
};

const TYPE_LABELS: Record<DataSource['type'], { heading: string; emoji: string; description: string }> = {
  forecast: { heading: 'Previsión', emoji: '🌤️', description: 'Modelos numéricos de previsión horaria y diaria' },
  'official-alert': { heading: 'Avisos oficiales', emoji: '⚠️', description: 'Alertas meteorológicas oficiales' },
  phytosanitary: { heading: 'Avisos fitosanitarios', emoji: '🐛', description: 'Red de Alerta e Información Fitosanitaria' },
  'local-sensor': { heading: 'Observado', emoji: '📡', description: 'Sensores locales de TecRural' },
};

const TYPE_ORDER: DataSource['type'][] = ['forecast', 'official-alert', 'phytosanitary', 'local-sensor'];

function AgeLabel({ iso }: { iso: string }) {
  const now = useClientNow();
  if (now === null) return null;
  return <span> · hace {ageDisplay(ageMinutes(iso, now))}</span>;
}

function SourceCard({ source }: { source: DataSource }) {
  const st = STATUS_STYLES[source.status];
  return (
    <div className={`rounded-xl border bg-white p-3 ${st.border}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-800">{source.name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${st.badge}`}>{st.label}</span>
          </div>
          {source.status !== 'active' && (
            <p className="mt-0.5 text-xs font-bold text-slate-700">{st.text}</p>
          )}
          <p className="mt-0.5 text-xs text-slate-500">{source.message}</p>
          {source.model && (
            <p className="text-[10px] text-slate-600 mt-0.5">Modelo: {source.model}</p>
          )}
          <p className="text-[10px] text-slate-600 mt-1" suppressHydrationWarning>
            Última lectura {fmtDateHourMadrid(source.updatedAt)}
            <AgeLabel iso={source.updatedAt} />
          </p>
        </div>
      </div>
    </div>
  );
}

function SourceGroup({ type, sources }: { type: DataSource['type']; sources: DataSource[] }) {
  if (sources.length === 0) return null;
  const meta = TYPE_LABELS[type];
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-1">
        {meta.emoji} {meta.heading}
      </h2>
      <p className="text-[11px] text-slate-500 mb-3">{meta.description}</p>
      <div className="space-y-2">
        {sources.map((s, i) => (
          <SourceCard key={`${s.name}-${i}`} source={s} />
        ))}
      </div>
    </section>
  );
}

export function FuentesPageClient({ response }: { response: HuescarWeatherResponse }) {
  const { sources, climate: cd, weather: wd, current } = response;

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    sources: sources.filter((s) => s.type === type),
  }));

  const activeCount = sources.filter((s) => s.status === 'active').length;
  const hasAttention = anyAttention(sources.map((s) => s.status));
  const qualityLabel = wd?.dataQuality ? effectiveQualityLabel(wd.dataQuality.quality, hasAttention) : null;
  const unavailableSources = sources.filter((s) => s.status === 'unavailable').length;

  // Sustitución informada: el titular actual se basa en un sensor local si existe;
  // si no, se avisa de que se usa el modelo (previsión) en su lugar.
  const localSource = sources.find((s) => s.type === 'local-sensor');
  const substituted =
    current.sourceName !== 'Sensor local auditado' &&
    (localSource?.status === 'unavailable' || localSource?.status === 'stale');

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 lg:pt-20" style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}>
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-0.5 text-xl font-black text-slate-900">Fuentes y fiabilidad</h1>
          <UpdatedAtNote response={response} />
        </header>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-700">
              {activeCount} de {sources.length} fuentes activas
              {wd?.dataQuality && qualityLabel && (
                <> · Calidad: {qualityLabel} · Principal: {primarySourceLabel(wd.dataQuality.primarySource)}</>
              )}
            </p>
            {hasAttention && (
              <p className="mt-1.5 text-xs font-semibold text-amber-700">
                {unavailableSources > 0
                  ? `${unavailableSources} fuente(s) no responden. Los datos afectados no se muestran como actuales.`
                  : 'Hay fuentes con datos desactualizados. Sus datos no se muestran como actuales.'}
              </p>
            )}
            {substituted && (
              <p className="mt-1.5 text-xs font-semibold text-sky-700">
                El sensor local no responde: el valor actual procede de la previsión/modelo (sustitución informada).
              </p>
            )}
          </div>

          {grouped.map(({ type, sources: groupSources }) => (
            <SourceGroup key={type} type={type} sources={groupSources} />
          ))}

          {sources.length === 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">No hay información de fuentes disponible.</p>
            </section>
          )}

          {wd?.dataQuality && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-3">📊 Calidad de los datos</h2>
              <div className="space-y-2">
                <QualityRow label="Calidad de los datos" value={qualityLabel ?? qualityLabelRaw(wd.dataQuality.quality)} />
                <QualityRow label="Fuente principal" value={primarySourceLabel(wd.dataQuality.primarySource)} />
                <QualityRow label="Fuentes activas" value={`${activeCount} / ${sources.length}`} />
              </div>
              {wd.dataQuality.explanation && (
                <p className="mt-3 border-t border-slate-100 pt-2 text-xs leading-5 text-slate-600">
                  {wd.dataQuality.explanation}
                </p>
              )}
            </section>
          )}

          {cd?.calibration?.realTemperatureC != null && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600 mb-3">⚙️ Calibración local</h2>
              <div className="space-y-2 text-sm">
                <Row label="Temperatura estimada" value={`${cd.calibration.realTemperatureC != null ? cd.calibration.realTemperatureC.toFixed(1) + '°C' : '—'}`} />
                <Row label="Corrección microclima" value={`${cd.microclimate.totalCorrectionC.toFixed(2)}°C`} />
                <Row label="Factor ráfagas" value={cd.microclimate.windGustReductionFactor.toFixed(2)} />
                <Row label="Elevación" value={`${cd.nodes.localStation?.elevationM ?? '—'} m`} />
              </div>
            </section>
          )}

          <div className="text-center pb-4">
            <Link href="/huescar" className="text-[11px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-800">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
      <NavBottom />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function QualityRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-800">{value}</span>
    </div>
  );
}

function qualityLabelRaw(quality: 'buena' | 'media' | 'baja'): string {
  if (quality === 'buena') return 'Buena';
  if (quality === 'media') return 'Media';
  return 'Baja';
}
