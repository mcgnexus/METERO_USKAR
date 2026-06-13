import { haversineKm } from "@/lib/geo";
import { HUESCAR_URBAN_CENTER } from "@/lib/geo";

export interface StationPrecipData {
  stationId: string;
  lat: number;
  lon: number;
  precipMm: number;
  distanceKm: number;
}

export interface PrecipCorrectionResult {
  correctedPrecipMm: number;
  stationContributions: StationPrecipData[];
  correctionApplied: boolean;
  description: string;
}

export function applyStationPrecipCorrection(
  basePrecipMm: number,
  stationReadings: StationPrecipData[] | null,
  maxRadiusKm: number = 15
): PrecipCorrectionResult {
  if (!stationReadings || stationReadings.length === 0) {
    return {
      correctedPrecipMm: basePrecipMm,
      stationContributions: [],
      correctionApplied: false,
      description: "Sin miniestaciones con pluviometro disponibles",
    };
  }

  const nearby = stationReadings
    .filter((s) => s.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  if (nearby.length === 0) {
    return {
      correctedPrecipMm: basePrecipMm,
      stationContributions: [],
      correctionApplied: false,
      description: "Miniestaciones fuera de radio",
    };
  }

  let totalWeight = 0;
  let weightedSum = 0;

  for (const s of nearby) {
    const weight = 1 / Math.max(s.distanceKm, 0.5);
    weightedSum += s.precipMm * weight;
    totalWeight += weight;
  }

  const stationAvg = totalWeight > 0 ? weightedSum / totalWeight : basePrecipMm;

  const stationWeight = Math.min(0.4, nearby.length * 0.1);
  const modelWeight = 1 - stationWeight;

  const corrected = basePrecipMm * modelWeight + stationAvg * stationWeight;

  const rounded = Math.round(corrected * 10) / 10;

  return {
    correctedPrecipMm: rounded,
    stationContributions: nearby,
    correctionApplied: Math.abs(rounded - basePrecipMm) > 0.05,
    description: `Correccion por ${nearby.length} miniestacion(es) cercana(s)`,
  };
}

export function extractStationPrecipData(
  stations: any[],
  targetLat: number = HUESCAR_URBAN_CENTER.lat,
  targetLon: number = HUESCAR_URBAN_CENTER.lon
): StationPrecipData[] {
  const results: StationPrecipData[] = [];

  for (const station of stations) {
    const stationId = String(station.node_code ?? station.id ?? "");
    if (!stationId) continue;

    const lat = station.lat ?? station.latitude;
    const lon = station.lon ?? station.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") continue;

    const precipRaw = station.rain ?? station.precipitation ?? station.precip ?? station.rain_1h ?? station.daily_precip;
    if (typeof precipRaw !== "number") continue;

    const distanceKm = haversineKm(targetLat, targetLon, lat, lon);

    results.push({
      stationId,
      lat,
      lon,
      precipMm: precipRaw,
      distanceKm: Math.round(distanceKm * 10) / 10,
    });
  }

  return results;
}
