'use client';

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { evaluateRaifAlert } from '@/services/raifCrossService';
import type { RaifAlertsPayload, RaifAlert, RaifSeverity, RaifCrossEvaluation } from '@/types/raif';
import type { WeatherPayload } from '@/types/weather';

function severityTone(sev: RaifSeverity): string {
  if (sev === 'alta') return 'bg-rose-100 text-rose-700 border-rose-200';
  if (sev === 'media') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-sky-100 text-sky-700 border-sky-200';
}

function severityLabel(sev: RaifSeverity): string {
  if (sev === 'alta') return 'Alta';
  if (sev === 'media') return 'Media';
  return 'Baja';
}

function severityEmoji(sev: RaifSeverity): string {
  if (sev === 'alta') return '🔴';
  if (sev === 'media') return '🟡';
  return '🔵';
}

function tipoLabel(tipo: string): string {
  const map: Record<string, string> = {
    actionable: 'Accionable',
    informative: 'Informativa',
    accionable: 'Accionable',
    informativa: 'Informativa',
  };
  return map[tipo.toLowerCase()] || tipo;
}

function tipoEmoji(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t === 'actionable' || t === 'accionable') return '⚡';
  return 'ℹ️';
}

function plagaEmoji(plaga: string): string {
  const map: Record<string, string> = {
    mosca_del_olivo: '🫒',
    repilo: '🫒',
    xylella_fastidiosa: '🫒',
    abichado_del_almendro: '🌰',
    monilia: '🌰',
    avispilla_del_almendro: '🐝',
    barrenillo: '🪵',
    vector_trips: '🌿',
    thrips_parvispinus: '🌿',
    cotonet: '🍋',
    mosca_blanca: '🌿',
    mildiu: '🍇',
    antracnosis: '🍊',
    mancha_oleosa: '🫒',
    cribado_del_almendro: '🌰',
    gusano_cabezudo: '🐛',
    caracoles_y_babosas: '🐌',
  };
  return map[plaga.toLowerCase().replace(/\s+/g, '_')] || '🌱';
}

function cultivoEmoji(cultivo: string): string {
  const map: Record<string, string> = {
    almendro: '🌰',
    olivo: '🫒',
    pistacho: '🥜',
    aguacate: '🥑',
    mango: '🥭',
    citricos: '🍊',
  };
  return map[cultivo.toLowerCase()] || '🌾';
}

function crossEmoji(level: RaifCrossEvaluation['riskLevel']): string {
  if (level === 'muy_favorable') return '🔥';
  if (level === 'favorable') return '⚠️';
  if (level === 'moderado') return '👀';
  if (level === 'desfavorable') return '✅';
  return '❓';
}

function crossTone(level: RaifCrossEvaluation['riskLevel']): string {
  if (level === 'muy_favorable') return 'text-rose-600';
  if (level === 'favorable') return 'text-amber-600';
  if (level === 'moderado') return 'text-sky-600';
  if (level === 'desfavorable') return 'text-emerald-600';
  return 'text-slate-400';
}

function crossLabel(level: RaifCrossEvaluation['riskLevel']): string {
  if (level === 'muy_favorable') return 'Muy favorable';
  if (level === 'favorable') return 'Favorable';
  if (level === 'moderado') return 'Moderado';
  if (level === 'desfavorable') return 'Desfavorable';
  return 'Desconocido';
}

function CrossEvaluation({ evaluation }: { evaluation: RaifCrossEvaluation }) {
  return (
    <div className="mt-3 rounded-[16px] border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${crossTone(evaluation.riskLevel)}`}>
          {crossEmoji(evaluation.riskLevel)} Clima: {crossLabel(evaluation.riskLevel)}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{evaluation.explanation}</p>
      {evaluation.factors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {evaluation.factors.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                f.favorable
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-500'
              }`}
            >
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${f.favorable ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {f.label}: {f.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function AlertCard({ alert, weather }: { alert: RaifAlert; weather: WeatherPayload | null }) {
  const [open, setOpen] = useState(false);
  const evaluation = weather
    ? evaluateRaifAlert(alert.plaga, {
        current: weather.current,
        hourly: weather.hourly,
        daily: weather.daily,
      })
    : null;

  return (
    <div className="surface-card rounded-[22px] border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${severityTone(alert.severidad)}`}>
              {severityEmoji(alert.severidad)} {severityLabel(alert.severidad)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {tipoEmoji(alert.tipo)} {tipoLabel(alert.tipo)}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {cultivoEmoji(alert.cultivo)} {alert.cultivo}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-950">{plagaEmoji(alert.plaga)} {alert.titulo}</h3>
          <p className="mt-1 text-xs font-medium text-slate-500">{plagaEmoji(alert.plaga)} {alert.plaga}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
        >
          {open ? 'Ocultar' : 'Ver más'}
        </button>
      </div>

      {evaluation && <CrossEvaluation evaluation={evaluation} />}

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <p className="text-sm leading-relaxed text-slate-700">{alert.resumen}</p>
          {alert.medidas && alert.medidas.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Medidas recomendadas</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-slate-700">
                {alert.medidas.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-3 text-[11px] text-slate-500">
            <span>Válida: {alert.validaDesde} → {alert.validaHasta}</span>
            {alert.fuenteUrl && (
              <a
                href={alert.fuenteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-600 hover:underline"
              >
                Fuente oficial →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function RaifPanel({ weather }: { weather: WeatherPayload | null }) {
  const { data, error, loading } = useApiData<RaifAlertsPayload>(
    '/api/weather/raif?zone=granada_interior',
    'raif-alerts-granada-interior'
  );

  if (loading) {
    return (
      <div className="surface-card flex min-h-[200px] items-center justify-center rounded-[28px] p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-500" />
      </div>
    );
  }

  if (error || !data || data.error) {
    return (
      <div className="surface-card rounded-[28px] p-6">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">RAIF</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">🌱 Alertas fitosanitarias</h2>
        <p className="mt-3 text-sm text-slate-500">
          📡 No se pudieron cargar las alertas de la Red de Alerta e Información Fitosanitaria.
        </p>
      </div>
    );
  }

  const alerts = data.alerts || [];

  return (
    <section className="surface-card rounded-[28px] border p-5 sm:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">RAIF</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">🌱 Alertas fitosanitarias</h2>
          <p className="mt-1 text-sm text-slate-600">
            Zona Altiplano de Granada · {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} activa{alerts.length !== 1 ? 's' : ''}
            {weather && ' · cruzadas con datos meteorológicos en tiempo real'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alerts.some((a) => a.severidad === 'alta') && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
              🚨 Acción urgente
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-emerald-200 bg-emerald-50/60 p-6 text-center">
          <p className="text-sm font-semibold text-emerald-800">✅ Sin alertas activas</p>
          <p className="mt-1 text-xs text-emerald-700">
            🌤️ No hay avisos fitosanitarios activos para el Altiplano de Granada en este momento.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} weather={weather} />
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        Fuente: Red de Alerta e Información Fitosanitaria (RAIF) — Consejería de Agricultura, Pesca, Agua y Desarrollo Rural de Andalucía.
        Actualizado: {data.fetchedAt ? new Date(data.fetchedAt).toLocaleString('es-ES') : '—'}
      </p>
    </section>
  );
}
