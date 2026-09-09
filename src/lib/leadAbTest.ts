'use client';

export type LeadVariant = 'A' | 'B';

/** Clave de persistencia de la variante asignada al visitante. */
const STORAGE_KEY = 'meteo_lead_ab_variant';

function readStored(): LeadVariant | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'A' || stored === 'B' ? stored : null;
  } catch {
    return null;
  }
}

function writeStored(variant: LeadVariant): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, variant);
  } catch {
    /* localStorage no disponible */
  }
}

/**
 * Asigna de forma estable la variante del experimento de captación de leads.
 * 50/50 A/B, persistida en localStorage para que cada visitante vea SIEMPRE
 * la misma variante. Soporta override por URL (?ab=A / ?ab=B) para validación.
 */
export function getLeadVariant(force?: LeadVariant | null): LeadVariant {
  if (force === 'A' || force === 'B') {
    writeStored(force);
    return force;
  }
  const stored = readStored();
  if (stored) return stored;
  const assigned: LeadVariant = Math.random() < 0.5 ? 'A' : 'B';
  writeStored(assigned);
  return assigned;
}

/** Lee la variante guardada sin asignar una nueva (para peticiones de API). */
export function storedLeadVariant(): LeadVariant | null {
  return readStored();
}