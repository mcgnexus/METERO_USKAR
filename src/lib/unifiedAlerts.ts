import type {
  AlertType,
  UnifiedAlert,
  UnifiedAlertLevel,
} from '@/types/alerts';
import type { WeatherAlert } from '@/types/weather';
import type { RaifAlert } from '@/types/raif';
import type { HuescarWeatherResponse } from '@/types/weather-response';
import type { PulseAlarm } from '@/components/llano/alarms-logic';

/** Acción recomendada según nivel de la alerta meteorológica y público afectado. */
export function recommendedAction(level: UnifiedAlertLevel, audience?: string): string {
  if (level === 'critico') {
    if (audience === 'Agricultura') return 'Activar medidas de protección. Revisar cultivos, sistemas antihelada y programación de riego.';
    if (audience === 'Ganaderia') return 'Revisar animales urgentemente. Asegurar agua, sombra y refugio. Evitar manejo y traslados.';
    return 'Tomar medidas inmediatas. Evitar exposición innecesaria. Revisar planes de contingencia.';
  }
  if (level === 'precaucion') {
    if (audience === 'Agricultura') return 'Preparar protección para cultivos sensibles. Vigilar evolución en próximas horas.';
    if (audience === 'Ganaderia') return 'Asegurar agua y sombra disponible. Vigilar animales vulnerables.';
    return 'Preparar medidas preventivas. Mantener vigilancia.';
  }
  if (level === 'aviso') {
    return 'Mantenerse informado. No requiere acción inmediata pero se recomienda vigilancia.';
  }
  return 'Informativo. No requiere acción; útil para planificar tareas de campo.';
}

/** Escala AEMET del feed → nivel unificado. */
function aemetLevel(level: WeatherAlert['level']): UnifiedAlertLevel {
  if (level === 'severo') return 'critico';
  if (level === 'peligro') return 'precaucion';
  return 'aviso';
}

/** Alerta meteorológica oficial del feed (AEMET/modelo) → formato unificado. */
export function weatherAlertToUnified(
  alert: WeatherAlert,
  index: number,
  generatedAt: string,
): UnifiedAlert {
  void index; // reservado para IDs estables futuros
  const isAemet = alert.source === 'aemet';
  return {
    id: `feed-${alert.source}-${index}`,
    type: 'weather',
    title: alert.title,
    message: alert.message,
    source: isAemet ? 'AEMET (oficial)' : 'Motor climático TecRural',
    sourceType: isAemet ? 'official-alert' : 'forecast',
    level: isAemet ? aemetLevel(alert.level) : 'info',
    date: generatedAt,
    action: recommendedAction(isAemet ? aemetLevel(alert.level) : 'info'),
  };
}

/** Alarma del motor climático (umbrales evaluados en el snapshot) → unificado. */
export function alarmToUnified(
  alarm: PulseAlarm,
  index: number,
  generatedAt: string,
): UnifiedAlert {
  return {
    id: `motor-${index}-${alarm.title}`,
    type: 'weather',
    title: alarm.title,
    message: alarm.message,
    source: alarm.source === 'aemet' ? 'AEMET (oficial)' : 'Motor climático TecRural',
    sourceType: alarm.source === 'aemet' ? 'official-alert' : 'forecast',
    level: alarm.level,
    date: generatedAt,
    action: recommendedAction(alarm.level, alarm.audience),
    audience: alarm.audience,
  };
}

/** Severidad RAIF → nivel unificado. Las informativas siempre son 'info'. */
export function raifLevel(alert: RaifAlert): UnifiedAlertLevel {
  if (alert.tipo === 'informativa') return 'info';
  if (alert.severidad === 'alta') return 'critico';
  if (alert.severidad === 'media') return 'aviso';
  return 'info';
}

/** Aviso fitosanitario oficial RAIF → unificado (acción = medidas recomendadas). */
export function raifAlertToUnified(alert: RaifAlert, index: number): UnifiedAlert {
  const level = raifLevel(alert);
  const action =
    alert.medidas.length > 0
      ? alert.medidas.join(' ')
      : 'Consultar la fuente oficial RAIF para las medidas recomendadas en esta zona.';
  return {
    id: `raif-${index}-${alert.id}`,
    type: 'phytosanitary',
    title: alert.titulo,
    message: `${alert.resumen} (Plaga: ${alert.plaga} · Cultivo: ${alert.cultivo} · Zona: ${alert.zona})`,
    source: 'RAIF — Junta de Andalucía (oficial)',
    sourceType: 'phytosanitary',
    level,
    date: alert.validaDesde,
    action,
    url: alert.fuenteUrl,
  };
}

/**
 * Recomendaciones agronómicas del motor TecRural (NO son avisos oficiales).
 * Se clasifican como 'agricultural-recommendation', separadas de las
 * meteorológicas y de los avisos fitosanitarios oficiales de RAIF.
 */
export function buildAgriculturalRecommendations(response: HuescarWeatherResponse): UnifiedAlert[] {
  const out: UnifiedAlert[] = [];
  const agri = response.weather?.agricultural;
  if (!agri) return out;
  const generatedAt = response.generatedAt;

  if (agri.recommendedIrrigationLitersM2 != null && agri.recommendedIrrigationLitersM2 > 0) {
    out.push({
      id: 'reco-riego',
      type: 'agricultural-recommendation',
      title: 'Riego recomendado',
      message: `El motor agronómico estima ${agri.recommendedIrrigationLitersM2} L/m² de aporte razonable en las próximas horas (ETc acumulada: ${agri.et0CumulativeMm} mm).`,
      source: 'Motor agronómico TecRural (no oficial)',
      sourceType: 'forecast',
      level: 'info',
      date: generatedAt,
      action: `Ajustar el riego a unos ${agri.recommendedIrrigationLitersM2} L/m² y reevaluar tras la próxima actualización del tiempo.`,
    });
  }

  if (agri.workability && !agri.workability.workable) {
    out.push({
      id: 'reco-laborable',
      type: 'agricultural-recommendation',
      title: 'Trabajos en campo desaconsejados',
      message: `Condiciones actuales desfavorables para labores: ${agri.workability.reasons.join('; ')}.`,
      source: 'Motor agronómico TecRural (no oficial)',
      sourceType: 'forecast',
      level: 'info',
      date: generatedAt,
      action: 'Retrasar pasadas de maquinaria hasta que el suelo y el viento lo permitan.',
    });
  }

  if (agri.pestRisk) {
    const risks: Array<{ name: string; risk: string }> = [
      { name: 'Repilo', risk: agri.pestRisk.repiloRisk },
      { name: 'Mosca del olivo', risk: agri.pestRisk.oliveFlyRisk },
    ];
    for (const { name, risk } of risks) {
      if (risk === 'alto') {
        out.push({
          id: `reco-plaga-${name.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'agricultural-recommendation',
          title: `Riesgo alto de ${name} según el modelo`,
          message: `Las condiciones meteorológicas actuales son favorables para el desarrollo de ${name} en olivar (riesgo alto del modelo propio). Comprueba los avisos oficiales de RAIF para tu zona.`,
          source: 'Motor agronómico TecRural (no oficial)',
          sourceType: 'forecast',
          level: 'aviso',
          date: generatedAt,
          action: 'Vigilar síntomas en el cultivo y seguir las recomendaciones oficiales de RAIF antes de tratar.',
        });
      }
    }
  }

  return out;
}

/** Conteo por categoría: cada tipo se cuenta por separado, nunca se mezclan. */
export function countByType(alerts: UnifiedAlert[]): Record<AlertType, number> {
  const counts: Record<AlertType, number> = {
    weather: 0,
    phytosanitary: 0,
    'agricultural-recommendation': 0,
  };
  for (const alert of alerts) counts[alert.type] += 1;
  return counts;
}
