import { getCalibrationMeasurements } from "@/lib/weatherStore";

const DEFAULT_PRIORS: Record<string, number> = {
  temperature: 1.5,
  humidity: 10,
  precipitation: 1,
  wind: 8,
  gusts: 12,
};

const SAMPLES_WEIGHT_DIVISOR = 24;

let cachedTolerances: Record<string, number> | null = null;

export async function getCalibratedTolerances(): Promise<Record<string, number>> {
  if (cachedTolerances) return cachedTolerances;

  try {
    const measurements = await getCalibrationMeasurements(45);
    const tolerances: Record<string, number> = {};

    for (const [variable, prior] of Object.entries(DEFAULT_PRIORS)) {
      const entry = measurements.find((m) => m.variable === variable);
      if (entry && entry.mae > 0) {
        const samples = 1;
        const w = samples / (samples + SAMPLES_WEIGHT_DIVISOR);
        const blended = prior * (1 - w) + entry.mae * w;
        tolerances[variable] = Math.max(prior * 0.5, Math.min(prior * 2, blended));
      } else {
        tolerances[variable] = prior;
      }
    }

    cachedTolerances = tolerances;
    return tolerances;
  } catch {
    cachedTolerances = { ...DEFAULT_PRIORS };
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
  return getCalibratedTolerances();
}
