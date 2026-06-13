import { getCalibrationMeasurements } from "@/lib/weatherStore";

const DEFAULT_PRIORS: Record<string, number> = {
  temperature: 1.5,
  humidity: 10,
  precipitation: 1,
  wind: 8,
  gusts: 12,
};

// M1 — TTL para el caché de tolerancias: en instancias serverless "calientes"
// la variable de módulo persiste indefinidamente. Con un TTL de 1 hora
// las tolerancias se refrescan aunque la instancia no se reinicie.
const SAMPLES_WEIGHT_DIVISOR = 24;
const TOLERANCE_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

let cachedTolerances: Record<string, number> | null = null;
let cacheTimestamp = 0;

export async function getCalibratedTolerances(): Promise<Record<string, number>> {
  // M1 — Respetar el TTL antes de devolver el caché
  if (cachedTolerances && Date.now() - cacheTimestamp < TOLERANCE_CACHE_TTL_MS) {
    return cachedTolerances;
  }

  try {
    const measurements = await getCalibrationMeasurements(45);
    const tolerances: Record<string, number> = {};

    for (const [variable, prior] of Object.entries(DEFAULT_PRIORS)) {
      const entry = measurements.find((m) => m.variable === variable);
      if (entry && entry.mae > 0) {
        // C4 — Usar el número real de muestras (antes siempre era 1, lo que hacía
        // que el prior dominara con un peso del 96%). Ahora con más muestras históricas
        // el MAE empírico tiene más peso que el prior.
        const samples = entry.sampleCount ?? 1;
        const w = samples / (samples + SAMPLES_WEIGHT_DIVISOR);
        const blended = prior * (1 - w) + entry.mae * w;
        tolerances[variable] = Math.max(prior * 0.5, Math.min(prior * 2, blended));
      } else {
        tolerances[variable] = prior;
      }
    }

    cachedTolerances = tolerances;
    cacheTimestamp = Date.now(); // M1 — Registrar el momento del caché
    return tolerances;
  } catch {
    cachedTolerances = { ...DEFAULT_PRIORS };
    cacheTimestamp = Date.now();
    return cachedTolerances;
  }
}

export function getCalibratedToleranceForVariable(variable: string): number {
  if (cachedTolerances && cachedTolerances[variable] !== undefined) {
    return cachedTolerances[variable];
  }
  return DEFAULT_PRIORS[variable] ?? 1;
}

export async function loadCalibratedTolerances(): Promise<Record<string, number>> {
  cachedTolerances = null;
  cacheTimestamp = 0;
  return getCalibratedTolerances();
}
