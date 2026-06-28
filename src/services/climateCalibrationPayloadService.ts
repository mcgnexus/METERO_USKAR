import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import { getCachedOrRefresh } from "@/lib/persistentCache";
import { computeClimateCalibration } from "@/services/climateCalibrationService";
import type { ClimateCalibrationPayload } from "@/types/climate";

const CLIMATE_CALIBRATION_CACHE_KEY = "weather:climate-calibration:v1";
const CLIMATE_CALIBRATION_CACHE_TTL_MS = 60_000;
const CLIMATE_CALIBRATION_STALE_MS = 15 * 60_000;

export async function getClimateCalibrationPayload(): Promise<ClimateCalibrationPayload> {
  return getCachedOrRefresh({
    key: CLIMATE_CALIBRATION_CACHE_KEY,
    ttlMs: CLIMATE_CALIBRATION_CACHE_TTL_MS,
    staleMs: CLIMATE_CALIBRATION_STALE_MS,
    load: async () => {
      const payload = await computeClimateCalibration();
      cacheSet(CLIMATE_CALIBRATION_CACHE_KEY, payload, CLIMATE_CALIBRATION_CACHE_TTL_MS);
      return payload;
    },
  });
}
