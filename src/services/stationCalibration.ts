import {
  saveStationComparison,
  getRecentStationComparisons,
  upsertStationCalibration,
} from "@/lib/weatherStore";

interface StationReading {
  node_code?: string;
  id?: string | number;
  temperature?: number;
  humidity?: number;
  measured_at?: string;
  updated_at?: string;
}

interface StationBias {
  variable: string;
  bias: number;
  sampleCount: number;
}

let biasCache: Record<string, StationBias[]> | null = null;
let biasCacheTimestamp = 0;
const BIAS_CACHE_TTL_MS = 30 * 60 * 1000;

export async function recordStationComparison(
  stationId: string,
  measuredAt: string,
  stationTemp: number | undefined,
  stationHum: number | undefined,
  referenceTemp: number,
  referenceHum: number
): Promise<void> {
  const promises: Promise<void>[] = [];
  if (stationTemp !== undefined && stationTemp !== null) {
    promises.push(saveStationComparison(stationId, measuredAt, "temperature", stationTemp, referenceTemp));
  }
  if (stationHum !== undefined && stationHum !== null) {
    promises.push(saveStationComparison(stationId, measuredAt, "humidity", stationHum, referenceHum));
  }
  if (promises.length > 0) {
    await Promise.all(promises).catch(() => {});
  }
}

export async function computeAndStoreStationBias(stationId: string): Promise<void> {
  const variables = ["temperature", "humidity"];
  for (const variable of variables) {
    const comparisons = await getRecentStationComparisons(stationId, variable, 30);
    if (comparisons.length < 5) continue;

    const sumError = comparisons.reduce((sum, c) => sum + c.error, 0);
    const bias = Math.round((sumError / comparisons.length) * 100) / 100;
    const significant = Math.abs(bias) > 0.3;

    if (significant) {
      await upsertStationCalibration(stationId, variable, bias, comparisons.length);
    }
  }
}

export async function calibrateStations(stationReadings: StationReading[], referenceTemp: number, referenceHum: number): Promise<void> {
  for (const station of stationReadings) {
    const stationId = String(station.node_code ?? station.id ?? "");
    if (!stationId) continue;

    const measuredAt = station.measured_at ?? station.updated_at ? String(station.measured_at ?? station.updated_at) : new Date().toISOString();
    const temp = typeof station.temperature === "number" ? station.temperature : undefined;
    const hum = typeof station.humidity === "number" ? station.humidity : undefined;

    await recordStationComparison(stationId, measuredAt, temp, hum, referenceTemp, referenceHum).catch(() => {});
    await computeAndStoreStationBias(stationId).catch(() => {});
  }
  biasCache = null;
}

export async function getStationBiases(): Promise<Record<string, StationBias[]>> {
  if (biasCache && Date.now() - biasCacheTimestamp < BIAS_CACHE_TTL_MS) {
    return biasCache;
  }
  const biases: Record<string, StationBias[]> = {};
  try {
    const dbBiases = await import("@/lib/weatherStore").then((m) => m.getAllStationCalibrations());
    biasCache = dbBiases;
    biasCacheTimestamp = Date.now();
    return dbBiases;
  } catch {
    return biases;
  }
}

export function applyStationBias(
  stationId: string,
  temperature: number | undefined,
  humidity: number | undefined,
  biases: Record<string, StationBias[]>
): { temperature: number | undefined; humidity: number | undefined } {
  const stationBiases = stationId ? biases[stationId] : undefined;
  if (!stationBiases || stationBiases.length === 0) return { temperature, humidity };

  let correctedTemp = temperature;
  let correctedHum = humidity;

  for (const b of stationBiases) {
    if (b.variable === "temperature" && temperature !== undefined) {
      correctedTemp = Math.round((temperature - b.bias) * 100) / 100;
    }
    if (b.variable === "humidity" && humidity !== undefined) {
      correctedHum = Math.round((humidity - b.bias) * 100) / 100;
    }
  }

  return { temperature: correctedTemp, humidity: correctedHum };
}
