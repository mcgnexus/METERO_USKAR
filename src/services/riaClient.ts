import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const RIA_API_BASE_URL = process.env.RIA_API_BASE_URL || "https://www.juntadeandalucia.es/agriculturaypesca/ifapa/riaws";
const RIA_API_TOKEN = process.env.RIA_API_TOKEN || "";
const RIA_PROVINCE_CODE = process.env.RIA_PROVINCE_CODE || "18";
const RIA_PRIMARY_STATION_CODE = process.env.RIA_PRIMARY_STATION_CODE || "1";
const RIA_FALLBACK_STATION_CODE = process.env.RIA_FALLBACK_STATION_CODE || "2";
const RIA_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface RiaDailyData {
  source: "RIA";
  provinceCode: string;
  stationCode: string;
  stationName: string;
  date: string;
  temperatureMeanC: number | null;
  humidityMeanPct: number | null;
  radiationMJm2Day: number | null;
  windSpeed2mMs: number | null;
  et0MmDay: number | null;
  raw: Record<string, unknown>;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (RIA_API_TOKEN) {
    headers.Authorization = `Bearer ${RIA_API_TOKEN}`;
    headers["X-API-Key"] = RIA_API_TOKEN;
  }
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  return res.json();
}

async function fetchStationDaily(stationCode: string, stationName: string): Promise<RiaDailyData | null> {
  const cacheKey = `ria:daily:${RIA_PROVINCE_CODE}:${stationCode}`;
  const cached = cacheGet<RiaDailyData>(cacheKey);
  if (cached) return cached;

  for (let daysAgo = 0; daysAgo <= 10; daysAgo++) {
    const date = isoDateDaysAgo(daysAgo);
    const url = `${RIA_API_BASE_URL}/datosdiarios/${RIA_PROVINCE_CODE}/${stationCode}/${date}/true`;
    const json = await fetchJson(url).catch(() => null);
    if (!json) continue;

    const data: RiaDailyData = {
      source: "RIA",
      provinceCode: RIA_PROVINCE_CODE,
      stationCode,
      stationName,
      date: String(json.fecha || date),
      temperatureMeanC: parseNumber(json.tempMedia),
      humidityMeanPct: parseNumber(json.humedadMedia),
      radiationMJm2Day: parseNumber(json.radiacion),
      windSpeed2mMs: parseNumber(json.velViento),
      et0MmDay: parseNumber(json.et0),
      raw: json,
    };
    cacheSet(cacheKey, data, RIA_CACHE_TTL_MS);
    return data;
  }

  return null;
}

export async function fetchBestRiaDailyData(): Promise<RiaDailyData | null> {
  const primary = await fetchStationDaily(RIA_PRIMARY_STATION_CODE, "Baza RIA").catch(() => null);
  if (primary?.radiationMJm2Day !== null || primary?.windSpeed2mMs !== null) return primary;
  return fetchStationDaily(RIA_FALLBACK_STATION_CODE, "Puebla de Don Fadrique RIA").catch(() => null);
}

export interface RiaDualData {
  baza: RiaDailyData | null;
  puebla: RiaDailyData | null;
}

export async function fetchAllRiaDailyData(): Promise<RiaDualData> {
  const [baza, puebla] = await Promise.all([
    fetchStationDaily(RIA_PRIMARY_STATION_CODE, "Baza RIA").catch(() => null),
    fetchStationDaily(RIA_FALLBACK_STATION_CODE, "Puebla de Don Fadrique RIA").catch(() => null),
  ]);
  return { baza, puebla };
}

export function dailyRadiationToAverageWm2(radiationMJm2Day: number): number {
  return radiationMJm2Day * 11.574074;
}
