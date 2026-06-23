import type { LocalStationRecord } from "@/services/stationService";

export type StationTimeValue = string | number | Date | undefined;

export interface LocalStationSnapshot {
  stationId: string;
  name: string;
  measuredAt?: string;
  temperatureC?: number;
  humidityPct?: number;
  pressureHPa?: number;
  elevationM?: number;
  lat?: number;
  lon?: number;
  precipitationMm?: number;
  windSpeedKmh?: number;
  batteryPct?: number;
  batteryV?: number;
  soilMoisturePct?: number;
  rssiDbm?: number;
}

export function parseStationNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function getStationId(station: LocalStationRecord): string {
  return String(station.node_code ?? station.id ?? "");
}

export function getStationName(station: LocalStationRecord): string {
  return String(station.name ?? station.location_name ?? station.node_code ?? "Estación local");
}

export function getStationTimeValue(station: LocalStationRecord): StationTimeValue {
  return station.updated_at
    ?? station.measured_at
    ?? station.timestamp
    ?? station.ultima_actualizacion
    ?? station.raw?.updated_at
    ?? station.raw?.measured_at
    ?? station.raw?.timestamp;
}

export function toIsoString(value: StationTimeValue): string | undefined {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  return undefined;
}

export function normalizeLocalStationSnapshot(station: LocalStationRecord): LocalStationSnapshot {
  return {
    stationId: getStationId(station),
    name: getStationName(station),
    measuredAt: toIsoString(getStationTimeValue(station)),
    temperatureC: parseStationNumber(
      station.temperature,
      station.temperatura,
      station.temp,
      station.air_temp_c,
      station.raw?.air_temp_c
    ),
    humidityPct: parseStationNumber(
      station.humidity,
      station.humedad,
      station.hr,
      station.air_humidity_pct,
      station.raw?.air_humidity_pct
    ),
    pressureHPa: parseStationNumber(
      station.pressure_hpa,
      station.presion,
      station.pressure,
      station.raw?.pressure_hpa
    ),
    elevationM: parseStationNumber(
      station.elevation,
      station.elevation_m,
      station.altitude,
      station.alt,
      station.raw?.elevation,
      station.raw?.altitude
    ),
    lat: parseStationNumber(station.lat, station.latitude, station.raw?.lat, station.raw?.latitude),
    lon: parseStationNumber(station.lon, station.lng, station.longitude, station.raw?.lon, station.raw?.lng, station.raw?.longitude),
    precipitationMm: parseStationNumber(
      (station as LocalStationRecord & { rain?: unknown }).rain,
      (station as LocalStationRecord & { precipitation?: unknown }).precipitation,
      (station as LocalStationRecord & { precip?: unknown }).precip,
      (station as LocalStationRecord & { rain_1h?: unknown }).rain_1h,
      (station as LocalStationRecord & { daily_precip?: unknown }).daily_precip
    ),
    windSpeedKmh: parseStationNumber(
      (station as LocalStationRecord & { wind_speed?: unknown }).wind_speed,
      (station as LocalStationRecord & { viento?: unknown }).viento
    ),
    batteryPct: parseStationNumber((station as LocalStationRecord & { battery?: unknown }).battery),
    batteryV: parseStationNumber(station.battery_v),
    soilMoisturePct: parseStationNumber(station.soil_moisture_pct),
    rssiDbm: parseStationNumber(station.rssi_dbm),
  };
}
