'use client';

import { useMemo, useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import { UnifiedAlertCard, UnifiedEmptyState } from '@/components/alerts/UnifiedAlertCard';
import { alarmToUnified, buildAgriculturalRecommendations, raifAlertToUnified, weatherAlertToUnified } from '@/lib/unifiedAlerts';
import type { AlertType, UnifiedAlert } from '@/types/alerts';
import type { RaifAlertsPayload } from '@/types/raif';
import type { HuescarWeatherResponse } from '@/types/weather-response';
import { buildAlarms } from '@/components/llano/alarms-logic';

const SECTIONS: { id: AlertType; label: string; emoji: string }[] = [
  { id: 'weather', label: 'Meteorológicas', emoji: '🌧️' },
  { id: 'phytosanitary', label: 'Fitosanitarios', emoji: '🐛' },
  { id: 'agricultural-recommendation', label: 'Recomendaciones', emoji: '🌾' },
];

const LEVEL_ORDER: Record<UnifiedAlert['level'], number> = { critico: 0, precaucion: 1, aviso: 2, info: 3 };

function sortAlerts(alerts: UnifiedAlert[]): UnifiedAlert[] {
  return [...alerts].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

function SectionTitle({ emoji, label, count }: { emoji: string; label: string; count: number }) {
  return (
    <h3 className="flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-[0.14em] text-slate-700">
      {emoji} {label}
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-700">{count}</span>
    </h3>
  );
}

/**
 * Secciones de alerta POR CATEGORÍA con contador independiente.
 * - Meteorológicas: feed AEMET + umbrales del motor (datos del snapshot).
 * - Fitosanitarios: avisos oficiales RAIF (carga en cliente).
 * - Recomendaciones agrícolas: motor agronómico TecRural (no oficial).
 * "0 alertas meteorológicas" nunca oculta avisos fitosanitarios activos.
 */
export function AlertsSections({ response }: { response: HuescarWeatherResponse }) {
  const [active, setActive] = useState<AlertType | 'all'>('all');
  const hasClimate = response.climate !== null;

  const weatherAlerts = useMemo<UnifiedAlert[]>(() => {
    const out: UnifiedAlert[] = [];
    // 1) Umbrales del motor sobre el snapshot (incluye traducción de avisos AEMET).
    if (hasClimate && response.climate) {
      const alarms = buildAlarms(response.climate, {
        daily: response.weather?.daily,
        weather: response.weather,
        agricultural: response.weather?.agricultural,
      });
      alarms.forEach((alarm, index) => out.push(alarmToUnified(alarm, index, response.generatedAt)));
    }
    // 2) Feed ligero de alertas (AEMET/modelo) que no dupliquen al motor.
    for (const alert of response.alerts) {
      const unified = weatherAlertToUnified(alert, out.length, response.generatedAt);
      if (!out.some((existing) => existing.title === unified.title && existing.message === unified.message)) {
        out.push(unified);
      }
    }
    return sortAlerts(out);
  }, [response, hasClimate]);

  const recommendations = useMemo(() => sortAlerts(buildAgriculturalRecommendations(response)), [response]);

  const { data: raifData, error: raifError, loading: raifLoading, refresh: raifRefresh } = useApiData<RaifAlertsPayload>(
    '/api/weather/raif?zone=granada_interior',
    'raif-alerts-granada-interior',
  );
  const raifAlerts = useMemo(() => {
    if (!raifData || raifData.error) return [];
    return sortAlerts((raifData.alerts || []).map((alert, index) => raifAlertToUnified(alert, index)));
  }, [raifData]);

  const counts: Record<AlertType, number> = {
    weather: weatherAlerts.length,
    phytosanitary: raifAlerts.length,
    'agricultural-recommendation': recommendations.length,
  };

  const visible = (id: AlertType) => active === 'all' || active === id;

  return (
    <div className="space-y-4">
      {/* Sub-navegación por categoría: contador independiente por tipo. */}
      <nav aria-label="Categorías de alerta" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActive('all')}
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active === 'all' ? 'bg-sky-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
        >
          Todas
        </button>
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActive(section.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${active === section.id ? 'bg-sky-700 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {section.emoji} {section.label}
            <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
              {section.id === 'phytosanitary' ? raifAlerts.length : counts[section.id]}
            </span>
          </button>
        ))}
      </nav>

      {/* 1) Alertas meteorológicas */}
      {visible('weather') && (
        <section className="space-y-3" aria-label="Alertas meteorológicas">
          <SectionTitle emoji="🌧️" label="Alertas meteorológicas" count={weatherAlerts.length} />
          {!hasClimate ? (
            <UnifiedEmptyState
              emoji="📡"
              title="Meteorología no disponible"
              message="No hay datos suficientes para evaluar los umbrales meteorológicos. No se puede confirmar que esté todo en calma."
            />
          ) : weatherAlerts.length === 0 ? (
            <UnifiedEmptyState
              emoji="🌤️"
              title="Sin alertas meteorológicas activas"
              message="Ni AEMET ni el motor climático superan umbrales de riesgo meteorológico ahora mismo."
            />
          ) : (
            weatherAlerts.map((alert) => <UnifiedAlertCard key={alert.id} alert={alert} />)
          )}
        </section>
      )}

      {/* 2) Avisos fitosanitarios (RAIF) — sección independiente */}
      {visible('phytosanitary') && (
        <section className="space-y-3" aria-label="Avisos fitosanitarios">
          <SectionTitle emoji="🐛" label="Avisos fitosanitarios" count={raifAlerts.length} />
          {raifLoading ? (
            <div className="h-24 animate-pulse rounded-[22px] bg-slate-100" />
          ) : raifError || !raifData || raifData.error ? (
            <div className="rounded-[22px] border border-slate-200 bg-white p-5 text-center">
              <p className="text-sm font-semibold text-slate-700">📡 No se pudieron cargar los avisos de RAIF.</p>
              <button
                type="button"
                onClick={raifRefresh}
                className="mt-3 rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white hover:bg-sky-800"
              >
                Reintentar
              </button>
            </div>
          ) : raifAlerts.length === 0 ? (
            <UnifiedEmptyState
              emoji="🌿"
              title="Sin avisos fitosanitarios activos"
              message="RAIF no tiene avisos activos para el Altiplano de Granada en este momento."
            />
          ) : (
            raifAlerts.map((alert) => <UnifiedAlertCard key={alert.id} alert={alert} />)
          )}
        </section>
      )}

      {/* 3) Recomendaciones agrícolas (motor propio, no oficial) */}
      {visible('agricultural-recommendation') && (
        <section className="space-y-3" aria-label="Recomendaciones agrícolas">
          <SectionTitle emoji="🌾" label="Recomendaciones agrícolas" count={recommendations.length} />
          {recommendations.length === 0 ? (
            <UnifiedEmptyState
              emoji="🌱"
              title="Sin recomendaciones destacadas"
              message="El motor agronómico no genera recomendaciones destacadas con las condiciones actuales."
            />
          ) : (
            recommendations.map((alert) => <UnifiedAlertCard key={alert.id} alert={alert} />)
          )}
        </section>
      )}
    </div>
  );
}
