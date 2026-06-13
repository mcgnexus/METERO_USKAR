import { fetchVegetationIndices, type VegetationIndices } from "@/services/sentinelService";
import { fetchWaterBodies, type WaterBody } from "@/services/osmService";

export interface VegetationData {
  ndvi: number | null;
  ndwi: number | null;
  coverage: string | null;
  nearestWaterKm: number | null;
  nearestWaterType: string | null;
  nearestWaterWeight: number;
  waterBodyCount: number;
}

export interface VegetationCorrections {
  temperatureAdjustmentC: number;
  humidityAdjustmentPct: number;
  dewPointShiftC: number;
}

export async function getVegetationData(lat: number, lon: number): Promise<VegetationData> {
  const [indices, water] = await Promise.all([
    fetchVegetationIndices(lat, lon).catch(() => ({ ndvi: null, ndwi: null, coverage: null }) as VegetationIndices),
    fetchWaterBodies(lat, lon).catch(() => [] as WaterBody[]),
  ]);

  const nearest = water.length > 0 ? water[0] : null;

  return {
    ndvi: indices.ndvi,
    ndwi: indices.ndwi,
    coverage: indices.coverage,
    nearestWaterKm: nearest?.distanceKm ?? null,
    nearestWaterType: nearest?.type ?? null,
    nearestWaterWeight: nearest?.weight ?? 0,
    waterBodyCount: water.length,
  };
}

export function applyVegetationCorrections(
  tempC: number,
  rhPct: number,
  veg: VegetationData | null
): VegetationCorrections {
  if (!veg) {
    return { temperatureAdjustmentC: 0, humidityAdjustmentPct: 0, dewPointShiftC: 0 };
  }

  let tempAdj = 0;
  let dewShift = 0;
  let humAdj = 0;

  if (veg.ndvi !== null) {
    if (veg.ndvi > 0.6) {
      tempAdj -= 0.5;
      dewShift += 0.3;
    } else if (veg.ndvi > 0.4) {
      tempAdj -= 0.3;
      dewShift += 0.2;
    } else if (veg.ndvi < 0.15) {
      tempAdj += 0.4;
      dewShift -= 0.2;
    }
  }

  if (veg.ndwi !== null && veg.ndwi > 0) {
    dewShift += 0.2;
    tempAdj -= 0.2;
  }

  if (veg.nearestWaterKm !== null && veg.nearestWaterWeight !== undefined && veg.nearestWaterWeight > 0) {
    const effectiveDist = veg.nearestWaterKm / veg.nearestWaterWeight;
    if (effectiveDist < 1) {
      humAdj += 4;
      dewShift += 0.5;
      tempAdj -= 0.3;
    } else if (effectiveDist < 3) {
      humAdj += 2;
      dewShift += 0.2;
    } else if (effectiveDist < 5) {
      humAdj += 1;
    }
  }

  return {
    temperatureAdjustmentC: Math.round(tempAdj * 100) / 100,
    humidityAdjustmentPct: Math.round(humAdj),
    dewPointShiftC: Math.round(dewShift * 100) / 100,
  };
}
