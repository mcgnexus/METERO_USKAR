import {
  getAggregatedValidation,
  getModelParameter,
  saveModelParameter,
  getAllModelParameters,
} from "@/lib/weatherStore";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/inMemoryCache";

const CACHE_KEY = "model_parameters";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_PARAMS: Record<string, number> = {
  reservoir_temp_bias_day: -0.5,
  reservoir_temp_bias_night: -0.2,
  reservoir_dew_bias: 0.4,
  night_inversion_valley: -1.5,
  night_inversion_mixed: -0.5,
  altitude_lapse_rate: 0.006,
  wind_factor_valley: 0.7,
  wind_factor_plateau: 1.2,
  orographic_barlovento_max: 0.4,
  orographic_sotavento_max: 0.35,
};

export interface ParameterTuningResult {
  key: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

export async function getModelParameters(): Promise<Record<string, number>> {
  const cached = cacheGet<Record<string, number>>(CACHE_KEY);
  if (cached) return cached;

  const dbParams = await getAllModelParameters().catch(() => ({} as Record<string, { value: number; previousValue: number | null; sampleCount: number }>));

  const merged: Record<string, number> = {};
  for (const [key, defaultValue] of Object.entries(DEFAULT_PARAMS)) {
    if (dbParams[key] !== undefined) {
      merged[key] = dbParams[key].value;
    } else {
      merged[key] = defaultValue;
    }
  }

  cacheSet(CACHE_KEY, merged, CACHE_TTL_MS);
  return merged;
}

// Parámetros cargados en memoria, accesibles de forma síncrona desde los
// servicios del modelo microclimático. Se refrescan vía refreshRuntimeParameters()
// (cron hourly + aggregateWeather) y arrancan con los defaults hasta la primera carga.
let runtimeParams: Record<string, number> = { ...DEFAULT_PARAMS };

export async function refreshRuntimeParameters(): Promise<void> {
  try {
    runtimeParams = await getModelParameters();
  } catch {
    // Se mantienen los parámetros anteriores (o defaults si es la primera carga).
  }
}

export function getModelParam(key: keyof typeof DEFAULT_PARAMS): number {
  const value = runtimeParams[key];
  return typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_PARAMS[key];
}

export async function tuneParametersFromHistory(): Promise<ParameterTuningResult[]> {
  const results: ParameterTuningResult[] = [];

  const agg = await getAggregatedValidation(30).catch(() => ({} as Record<string, any>));
  const current = await getModelParameters();

  const aemetTempKey = "AEMET_temperature_all_all";
  const aemetHumKey = "AEMET_humidity_all_all";
  const omTempKey = "OPEN_METEO_temperature_all_all";

  const aemetTemp = agg[aemetTempKey];
  const aemetHum = agg[aemetHumKey];
  const omTemp = agg[omTempKey];

  if (aemetTemp && aemetTemp.avgBias !== 0 && aemetTemp.totalSamples >= 10) {
    const bias = aemetTemp.avgBias;

    const oldDay = current.reservoir_temp_bias_day;
    const newDay = Math.round((oldDay - bias * 0.3) * 1000) / 1000;
    if (Math.abs(newDay - oldDay) > 0.02) {
      await saveModelParameter("reservoir_temp_bias_day", newDay, aemetTemp.totalSamples);
      results.push({
        key: "reservoir_temp_bias_day",
        oldValue: oldDay,
        newValue: newDay,
        reason: `Bias AEMET temp ${bias > 0 ? "positivo" : "negativo"} (${bias.toFixed(2)}), ajuste parcial`,
      });
    }

    const oldNight = current.reservoir_temp_bias_night;
    const aemetNight = agg["AEMET_temperature_noche_all"];
    if (aemetNight && aemetNight.avgBias !== 0 && aemetNight.totalSamples >= 5) {
      const nightBias = aemetNight.avgBias;
      const newNight = Math.round((oldNight - nightBias * 0.3) * 1000) / 1000;
      if (Math.abs(newNight - oldNight) > 0.02) {
        await saveModelParameter("reservoir_temp_bias_night", newNight, aemetNight.totalSamples);
        results.push({
          key: "reservoir_temp_bias_night",
          oldValue: oldNight,
          newValue: newNight,
          reason: `Bias nocturno AEMET (${nightBias.toFixed(2)})`,
        });
      }
    }
  }

  if (aemetHum && aemetHum.avgBias !== 0 && aemetHum.totalSamples >= 10) {
    const humBias = aemetHum.avgBias;
    const oldDew = current.reservoir_dew_bias;
    const newDew = Math.round((oldDew + humBias * 0.01) * 1000) / 1000;
    if (Math.abs(newDew - oldDew) > 0.02) {
      await saveModelParameter("reservoir_dew_bias", newDew, aemetHum.totalSamples);
      results.push({
        key: "reservoir_dew_bias",
        oldValue: oldDew,
        newValue: newDew,
        reason: `Bias humedad AEMET (${humBias.toFixed(1)}%), correccion punto de rocio`,
      });
    }
  }

  if (omTemp && omTemp.avgBias !== 0 && omTemp.totalSamples >= 10) {
    const bias = omTemp.avgBias;
    const oldLapse = current.altitude_lapse_rate;
    const newLapse = Math.round((oldLapse + bias * 0.0001) * 1000000) / 1000000;
    const clampedLapse = Math.max(0.004, Math.min(0.009, newLapse));
    if (Math.abs(clampedLapse - oldLapse) > 0.0001) {
      await saveModelParameter("altitude_lapse_rate", clampedLapse, omTemp.totalSamples);
      results.push({
        key: "altitude_lapse_rate",
        oldValue: oldLapse,
        newValue: clampedLapse,
        reason: `Bias OM temp (${bias.toFixed(2)}), ajuste gradiente altitudinal`,
      });
    }
  }

  if (results.length > 0) {
    cacheDelete(CACHE_KEY);
    runtimeParams = await getModelParameters();
  }

  return results;
}

export function getDefaultParameters(): Record<string, number> {
  return { ...DEFAULT_PARAMS };
}
