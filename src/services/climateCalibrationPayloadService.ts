import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import { computeClimateCalibration } from "@/services/climateCalibrationService";
import type { ClimateCalibrationPayload } from "@/types/climate";

const CLIMATE_CALIBRATION_CACHE_KEY = "weather:climate-calibration:v1";
const CLIMATE_CALIBRATION_CACHE_TTL_MS = 60_000;

export async function getClimateCalibrationPayload(): Promise<ClimateCalibrationPayload> {
  const cached = cacheGet<ClimateCalibrationPayload>(CLIMATE_CALIBRATION_CACHE_KEY);
  if (cached) {
    return cached;
  }

  const payload = await computeClimateCalibration();
  cacheSet(CLIMATE_CALIBRATION_CACHE_KEY, payload, CLIMATE_CALIBRATION_CACHE_TTL_MS);
  return payload;
}
