import type { SourceObservation } from "@/types/weather";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const AEMET_API_KEY = process.env.AEMET_API_KEY || "";
const AEMET_OBSERVATION_URL =
  process.env.AEMET_OBSERVATION_URL ||
  "https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/5051X";
const AEMET_TIMEOUT_MS = parseInt(process.env.AEMET_TIMEOUT_MS || "12000");
const AEMET_MAX_ATTEMPTS = parseInt(process.env.AEMET_MAX_ATTEMPTS || "2");
const AEMET_RETRY_DELAY_MS = parseInt(process.env.AEMET_RETRY_DELAY_MS || "2000");

const CACHE_KEY_OBSERVATIONS = `aemet_observations:${AEMET_OBSERVATION_URL}`;
const CACHE_FRESH_TTL_MS = 60 * 60 * 1000;
const CACHE_STALE_TTL_MS = 4 * 60 * 60 * 1000;
const COOLDOWN_KEY = "aemet_cooldown";
const COOLDOWN_TTL_MS = parseInt(process.env.AEMET_FAILURE_COOLDOWN_MS || "600000");
const RATE_LIMIT_COOLDOWN_TTL_MS = parseInt(process.env.AEMET_RATE_LIMIT_COOLDOWN_MS || "900000");

interface CooldownEntry {
  until: number;
}

function isInCooldown(): boolean {
  const entry = cacheGet<CooldownEntry>(COOLDOWN_KEY);
  if (!entry) return false;
  return Date.now() < entry.until;
}

function setCooldown(ttlMs: number): void {
  cacheSet<CooldownEntry>(COOLDOWN_KEY, { until: Date.now() + ttlMs }, ttlMs);
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchDataUrl(apiKey: string, observationUrl: string): Promise<string | null> {
  const url = `${observationUrl}?api_key=${apiKey}`;
  const response = await fetchWithTimeout(url, AEMET_TIMEOUT_MS);
  if (response.status === 429) {
    console.warn(`[AEMET] Rate limit (429) — cooldown ${RATE_LIMIT_COOLDOWN_TTL_MS / 1000}s`);
    setCooldown(RATE_LIMIT_COOLDOWN_TTL_MS);
    return null;
  }
  // M4 — No logar la URL completa para no exponer la API key
  if (!response.ok) {
    console.warn(`[AEMET] fetchDataUrl HTTP ${response.status} para ${observationUrl} (api_key omitida)`);
    return null;
  }
  const text = await response.text();
  if (!text.trim()) {
    console.warn(`[AEMET] fetchDataUrl HTTP 200 con cuerpo vacio para ${observationUrl}`);
    return null;
  }
  const json = JSON.parse(text);
  if (!json || !json.datos) return null;
  return json.datos;
}

async function fetchRealData(dataUrl: string): Promise<unknown[] | null> {
  const response = await fetchWithTimeout(dataUrl, AEMET_TIMEOUT_MS);
  if (!response.ok) return null;
  const text = await response.text();
  if (!text.trim()) {
    console.warn("[AEMET] fetchRealData HTTP 200 con cuerpo vacio");
    return null;
  }
  return JSON.parse(text);
}

function parseAemetStation(raw: Record<string, unknown>): SourceObservation | null {
  const stationId = String(raw.idema || raw.id || "").trim().toUpperCase();
  const defaultId = "5051X";

  const matchesHuescar = stationId === defaultId || stationId === "" || !stationId;
  if (!matchesHuescar) return null;

  const effectiveId = stationId || defaultId;

  const temperatureC = parseNumber(raw.ta);
  const humidityPct = parseNumber(raw.hr);
  const precipitationMm = parseNumber(raw.prec);
  const windSpeedMs = parseNumber(raw.vv);
  const windGustMs = parseNumber(raw.vmax);

  if (temperatureC === null) return null;

  const timeStr = String(raw.fint || raw.updated || "");

  // El endpoint de AEMET publica a :00 UTC (horario). El dato más reciente
  // disponible tiene siempre 20-90 min de antigüedad. La penalización por edad
  // empieza a los 60 min (no 30) y el mínimo es 0.5 (no 0.3), porque para un
  // endpoint horario un dato de 60-90 min es perfectamente válido.
  const ageMinutes = timeStr
    ? Math.max(0, (Date.now() - new Date(timeStr).getTime()) / 60000)
    : 120;
  const dynamicQualityScore = Math.max(0.5, 1.0 - Math.max(0, ageMinutes - 60) / 240);

  return {
    source: "AEMET",
    stationId: effectiveId,
    locationName: "Huéscar",
    time: timeStr,
    observationPeriod: "current",
    dataAgeMinutes: 0,
    qualityScore: dynamicQualityScore,
    status: "OK",
    elevationM: parseNumber(raw.alt) ?? undefined,
    rawTemperatureC: temperatureC,
    temperatureC,
    humidityPct: humidityPct ?? 0,
    precipitationMm: precipitationMm ?? 0,
    windSpeedKmh: windSpeedMs !== null ? Math.round(windSpeedMs * 3.6 * 10) / 10 : 0,
    windGustKmh: windGustMs !== null ? Math.round(windGustMs * 3.6 * 10) / 10 : 0,
  };
}

function parseNumber(val: unknown): number | null {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  return null;
}

function buildObservations(rawData: unknown[]): SourceObservation[] {
  const result: SourceObservation[] = [];
  for (const item of rawData) {
    if (typeof item !== "object" || item === null) continue;
    const parsed = parseAemetStation(item as Record<string, unknown>);
    if (parsed) result.push(parsed);
  }
  return result.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function reduceQuality(observations: SourceObservation[]): SourceObservation[] {
  const now = Date.now();
  return observations.map((obs) => {
    const ageMin = (now - new Date(obs.time).getTime()) / 60000;
    const reduction = ageMin > 120 ? 0.4 : 0.2;
    return {
      ...obs,
      qualityScore: Math.max(0.15, Math.round((obs.qualityScore - reduction) * 100) / 100),
      dataAgeMinutes: ageMin,
      retrievalStatus: "STALE_CACHE" as const,
    };
  });
}

function getUsableCache(key: string): SourceObservation[] | null {
  const cached = cacheGet<SourceObservation[]>(key);
  return cached && cached.length > 0 ? cached : null;
}

export async function fetchAEMETObservations(): Promise<{
  observations: SourceObservation[];
  status: "LIVE" | "FRESH_CACHE" | "STALE_CACHE";
}> {
  if (!AEMET_API_KEY) {
    return { observations: [], status: "FRESH_CACHE" };
  }

  const freshCached = getUsableCache(CACHE_KEY_OBSERVATIONS);
  if (freshCached) {
    return { observations: freshCached, status: "FRESH_CACHE" };
  }

  if (isInCooldown()) {
    const stale = getUsableCache(`${CACHE_KEY_OBSERVATIONS}_stale`);
    if (stale) {
      return { observations: reduceQuality(stale), status: "STALE_CACHE" };
    }
    return { observations: [], status: "FRESH_CACHE" };
  }

  const staleCached = getUsableCache(`${CACHE_KEY_OBSERVATIONS}_stale`);
  if (staleCached) {
    return { observations: reduceQuality(staleCached), status: "STALE_CACHE" };
  }

  for (let attempt = 1; attempt <= AEMET_MAX_ATTEMPTS; attempt++) {
    const dataUrl = await fetchDataUrl(AEMET_API_KEY, AEMET_OBSERVATION_URL);
    if (!dataUrl) {
      if (attempt < AEMET_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, AEMET_RETRY_DELAY_MS));
        continue;
      }
      setCooldown(COOLDOWN_TTL_MS);
      const stale = getUsableCache(`${CACHE_KEY_OBSERVATIONS}_stale`);
      if (stale) {
        return { observations: reduceQuality(stale), status: "STALE_CACHE" };
      }
      return { observations: [], status: "FRESH_CACHE" };
    }

    const rawData = await fetchRealData(dataUrl);
    if (!rawData || !Array.isArray(rawData)) {
      if (attempt < AEMET_MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, AEMET_RETRY_DELAY_MS));
        continue;
      }
      setCooldown(COOLDOWN_TTL_MS);
      const stale = getUsableCache(`${CACHE_KEY_OBSERVATIONS}_stale`);
      if (stale) {
        return { observations: reduceQuality(stale), status: "STALE_CACHE" };
      }
      return { observations: [], status: "FRESH_CACHE" };
    }

    const observations = buildObservations(rawData);
    if (observations.length > 0) {
      const ageMin = observations[0]?.time
        ? Math.round((Date.now() - new Date(observations[0].time).getTime()) / 60000)
        : 0;
      console.log(`[AEMET] OK: ${observations.length} obs, dato de hace ${ageMin} min`);
      cacheSet(CACHE_KEY_OBSERVATIONS, observations, CACHE_FRESH_TTL_MS);
      cacheSet(`${CACHE_KEY_OBSERVATIONS}_stale`, observations, CACHE_STALE_TTL_MS);
    }
    return { observations, status: "LIVE" };
  }

  return { observations: [], status: "FRESH_CACHE" };
}
