import {
  getAggregatedValidation,
  saveModelParameter,
  getAllModelParameters,
  type AggregatedValidationSummary,
} from "@/lib/weatherStore";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/inMemoryCache";

const CACHE_KEY = "model_parameters";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const DEFAULT_PARAMS: Record<string, number> = {
  reservoir_temp_bias_day: -0.3,
  reservoir_temp_bias_night: 0.4,
  reservoir_humidity_bias_pct: 15,
  reservoir_dew_bias: 0.5,
  altitude_lapse_rate: 0.0065,
  urban_heat_island_day_c: 0.2,
  urban_heat_island_night_c: 0.5,
  cold_air_drainage_max_c: -5.0,
  cold_air_drainage_factor_urban_center: 0.5,
  cold_air_drainage_factor_urban_barrio: 0.7,
  cold_air_drainage_factor_vega: 1.0,
  cold_air_drainage_factor_monte: 0.2,
  cold_air_drainage_factor_reservoir: 0.3,
  inversion_wind_threshold_ms: 2.0,
  rainfall_foehn_factor: 0.5,
  wind_gust_reduction_factor: 0.6,
  vega_friction_factor: 0.85,
  negratin_penalty_factor: 0.85,
  negratin_west_min_deg: 225,
  negratin_west_max_deg: 315,
  negratin_humidity_threshold: 90,
  night_inversion_valley: -3.5,
  night_inversion_mixed: -1.5,
  wind_factor_valley: 0.7,
  wind_factor_plateau: 1.2,
  orographic_barlovento_max: 0.4,
  orographic_sotavento_max: 0.35,
  sensor_blend_weight_fresh: 0.9,
  sensor_blend_weight_medium: 0.4,
  sensor_fresh_threshold_min: 30,
  sensor_medium_threshold_min: 180,
  sensor_medium_decay_min: 180,
  temporal_smoothing_alpha: 0.7,
  confidence_age_penalty_max: 20,
  confidence_age_penalty_divisor: 3,
  dynamic_residual_feedback_factor: 0.3,
  dynamic_residual_min_samples: 30,
};

export interface ParameterTuningResult {
  key: string;
  oldValue: number;
  newValue: number;
  reason: string;
}

type StoredModelParameter = {
  value: number;
  previousValue: number | null;
  sampleCount: number;
};

async function getStoredModelParameters(): Promise<Record<string, StoredModelParameter>> {
  try {
    return await getAllModelParameters();
  } catch {
    return {};
  }
}

async function getAggregatedValidationSafe(): Promise<Record<string, AggregatedValidationSummary>> {
  try {
    return await getAggregatedValidation(30);
  } catch {
    return {};
  }
}

export async function getModelParameters(): Promise<Record<string, number>> {
  const cached = cacheGet<Record<string, number>>(CACHE_KEY);
  if (cached) return cached;

  const dbParams = await getStoredModelParameters();
  const merged: Record<string, number> = {};

  for (const [key, defaultValue] of Object.entries(DEFAULT_PARAMS)) {
    merged[key] = dbParams[key]?.value ?? defaultValue;
  }

  cacheSet(CACHE_KEY, merged, CACHE_TTL_MS);
  return merged;
}

let runtimeParams: Record<string, number> = { ...DEFAULT_PARAMS };

export async function refreshRuntimeParameters(): Promise<void> {
  try {
    runtimeParams = await getModelParameters();
  } catch {
    // Keep previous runtime params.
  }
}

export function getModelParam(key: keyof typeof DEFAULT_PARAMS): number {
  const value = runtimeParams[key];
  return typeof value === "number" && Number.isFinite(value) ? value : DEFAULT_PARAMS[key];
}

export async function tuneParametersFromHistory(): Promise<ParameterTuningResult[]> {
  const results: ParameterTuningResult[] = [];
  const aggregated = await getAggregatedValidationSafe();
  const current = await getModelParameters();

  const aemetTemp = aggregated["AEMET_temperature_all_all"];
  const aemetHum = aggregated["AEMET_humidity_all_all"];
  const omTemp = aggregated["OPEN_METEO_temperature_all_all"];

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
    const aemetNight = aggregated["AEMET_temperature_noche_all"];
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
    const humidityBias = aemetHum.avgBias;
    const oldDew = current.reservoir_dew_bias;
    const newDew = Math.round((oldDew + humidityBias * 0.01) * 1000) / 1000;
    if (Math.abs(newDew - oldDew) > 0.02) {
      await saveModelParameter("reservoir_dew_bias", newDew, aemetHum.totalSamples);
      results.push({
        key: "reservoir_dew_bias",
        oldValue: oldDew,
        newValue: newDew,
        reason: `Bias humedad AEMET (${humidityBias.toFixed(1)}%), correccion punto de rocio`,
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
