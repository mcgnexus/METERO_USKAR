export type ConfidenceTier = 'alta' | 'media' | 'baja';

export function confidenceTier(confidencePct: number): ConfidenceTier {
  if (confidencePct >= 75) return 'alta';
  if (confidencePct >= 50) return 'media';
  return 'baja';
}

export function confidenceHeadline(confidencePct: number): string {
  const tier = confidenceTier(confidencePct);
  if (tier === 'alta') return 'Fiabilidad alta';
  if (tier === 'media') return 'Fiabilidad media';
  return 'Fiabilidad baja';
}

export function confidenceExplanation(confidencePct: number, hasTrustedLocalSensor: boolean): string {
  const tier = confidenceTier(confidencePct);
  if (tier === 'alta') {
    return hasTrustedLocalSensor
      ? 'Adecuado para planificación diaria y decisiones de campo con buena base operativa.'
      : 'Adecuado para planificación general y seguimiento diario; no sustituye una lectura in situ.';
  }
  if (tier === 'media') {
    return hasTrustedLocalSensor
      ? 'Útil para planificación general. Conviene contrastar si la decisión es sensible.'
      : 'Útil para planificación general. Sin sensor local, no conviene usarlo como única referencia para decisiones críticas.';
  }
  return hasTrustedLocalSensor
    ? 'Orientación limitada: usa el resultado como apoyo y contrástalo antes de decisiones críticas.'
    : 'Orientación limitada: trabaja bien para planificación general, pero conviene contrastarlo antes de decisiones críticas.';
}

export function confidenceFallbackLine(hasTrustedLocalSensor: boolean): string {
  return hasTrustedLocalSensor
    ? 'El sensor local está activo y auditado contra el modelo.'
    : 'Sin sensor local activo: el motor se apoya en estaciones cercanas y correcciones físicas para mantener la utilidad operativa.';
}
