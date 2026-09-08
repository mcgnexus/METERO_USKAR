import type { DataSourceType } from '@/types/weather-response';

/**
 * Clasificación de alertas por naturaleza, separadas para el usuario:
 *  - weather → alertas meteorológicas (AEMET oficial + motor climático propio)
 *  - phytosanitary → avisos fitosanitarios oficiales (RAIF, Junta de Andalucía)
 *  - agricultural-recommendation → recomendaciones agronómicas del motor TecRural
 *
 * Cada categoría se cuenta y se muestra por separado: NUNCA se mezclan en un
 * único contador ("0 alertas" meteorológicas no significa que no haya avisos
 * fitosanitarios activos).
 */
export type AlertType = 'weather' | 'phytosanitary' | 'agricultural-recommendation';

export type UnifiedAlertLevel = 'critico' | 'precaucion' | 'aviso' | 'info';

export interface UnifiedAlert {
  id: string;
  type: AlertType;
  title: string;
  /** Qué ocurre. */
  message: string;
  /** Nombre legible de la fuente (p. ej. "AEMET", "RAIF — Junta de Andalucía"). */
  source: string;
  /** Categoría de fuente según la jerarquía de datos. */
  sourceType: DataSourceType;
  level: UnifiedAlertLevel;
  /** Fecha ISO UTC de emisión o inicio de validez. */
  date: string;
  /** Acción recomendada para el usuario. */
  action: string;
  /** Enlace a la fuente oficial si existe. */
  url?: string;
  /** Público afectado (meteorológicas del motor). */
  audience?: string;
}

export const ALERT_TYPE_META: Record<AlertType, { label: string; emoji: string }> = {
  weather: { label: 'Alertas meteorológicas', emoji: '🌧️' },
  phytosanitary: { label: 'Avisos fitosanitarios', emoji: '🐛' },
  'agricultural-recommendation': { label: 'Recomendaciones agrícolas', emoji: '🌾' },
};

