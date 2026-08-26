import WebSocket from "ws";
import { haversineKm, bearing, HUESCAR_COORDS } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { LightningData, LightningStrike } from "@/types/weather";

const CACHE_KEY = "lightning_data";
const CACHE_TTL_MS = 120_000;
const COLLECT_MS = 6000;
const CONNECT_TIMEOUT_MS = 4000;
const MAX_SERVERS_TO_TRY = 4;

const BLITZORTUNG_SERVERS = Array.from(
  { length: 8 },
  (_, i) => `wss://ws${i + 1}.blitzortung.org:3000/`
);

interface DecodedStrike {
  lat: number;
  lon: number;
  time: Date;
}

interface BlitzortungResult {
  connected: boolean;
  strikes: LightningStrike[];
}

function decodeStrike(data: unknown): DecodedStrike | null {
  if (Buffer.isBuffer(data)) {
    const buf = data as Buffer;
    if (buf.length >= 12) {
      const lat = buf.readInt32LE(0) / 1_000_000;
      const lon = buf.readInt32LE(4) / 1_000_000;
      const ts = buf.readUInt32LE(8);
      if (Number.isFinite(lat) && Number.isFinite(lon) && ts > 0) {
        return { lat, lon, time: new Date(ts * 1000) };
      }
    }
  }

  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);

      if (Array.isArray(parsed) && parsed.length >= 3) {
        const [ts, lat, lon] = parsed;
        if (
          typeof ts === "number" &&
          typeof lat === "number" &&
          typeof lon === "number"
        ) {
          return { lat, lon, time: new Date(ts * 1000) };
        }
      }

      if (
        parsed &&
        typeof parsed.lat === "number" &&
        typeof parsed.lon === "number"
      ) {
        const rawTimestamp =
          typeof parsed.time === "number"
            ? parsed.time
            : typeof parsed.timestamp === "number"
              ? parsed.timestamp
              : Date.now();
        const timestampMs = rawTimestamp < 1_000_000_000_000 ? rawTimestamp * 1000 : rawTimestamp;
        return { lat: parsed.lat, lon: parsed.lon, time: new Date(timestampMs) };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getLevel(distanceKm: number): LightningData["level"] {
  if (distanceKm < 5) return "peligro";
  if (distanceKm < 15) return "alerta";
  if (distanceKm < 30) return "precaucion";
  return "info";
}

async function tryBlitzortungServer(
  serverUrl: string,
  lat: number,
  lon: number,
  radiusKm: number
): Promise<BlitzortungResult> {
  return new Promise<BlitzortungResult>((resolve, reject) => {
    const strikes: LightningStrike[] = [];
    let connected = false;
    let settled = false;

    const cleanup = () => {
      try {
        ws.removeAllListeners();
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {}
    };

    const ws = new WebSocket(serverUrl);
    const connectTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        clearTimeout(collectTimeout);
        cleanup();
        reject(new Error(`connect timeout on ${serverUrl}`));
      }
    }, CONNECT_TIMEOUT_MS);

    const collectTimeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        clearTimeout(connectTimeout);
        cleanup();
        resolve({ connected, strikes });
      }
    }, COLLECT_MS);

    ws.on("open", () => {
      connected = true;
      clearTimeout(connectTimeout);
      try {
        ws.send(JSON.stringify({ a: 1 }));
      } catch {}
    });

    ws.on("message", (data: Buffer | string) => {
      const decoded = decodeStrike(data);
      if (!decoded) return;
      const distanceKm = haversineKm(lat, lon, decoded.lat, decoded.lon);
      if (distanceKm > radiusKm) return;
      strikes.push({
        time: decoded.time.toISOString(),
        lat: decoded.lat,
        lon: decoded.lon,
        distanceKm: Math.round(distanceKm * 10) / 10,
        bearing: bearing(lat, lon, decoded.lat, decoded.lon),
      });
    });

    ws.on("error", (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(connectTimeout);
        clearTimeout(collectTimeout);
        cleanup();
        reject(err);
      }
    });

    ws.on("close", () => {
      if (!settled) {
        settled = true;
        clearTimeout(connectTimeout);
        clearTimeout(collectTimeout);
        resolve({ connected, strikes });
      }
    });
  });
}

async function fetchBlitzortung(
  lat: number,
  lon: number,
  radiusKm: number
): Promise<LightningStrike[] | null> {
  const shuffled = [...BLITZORTUNG_SERVERS].sort(() => Math.random() - 0.5);
  const toTry = shuffled.slice(0, MAX_SERVERS_TO_TRY);
  let connected = false;

  for (const server of toTry) {
    try {
      const result = await tryBlitzortungServer(server, lat, lon, radiusKm);
      connected ||= result.connected;
      if (result.strikes.length > 0) return result.strikes;
    } catch {
      continue;
    }
  }

  return connected ? [] : null;
}

async function fetchOpenMeteoCapeFallback(
  lat: number,
  lon: number
): Promise<LightningData | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=cape,lifted_index` +
      `&models=gem_global`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();

    const cape: number | undefined = data?.current?.cape;
    const liftedIndex: number | undefined = data?.current?.lifted_index;
    const thunderstormLikely =
      (cape !== undefined && cape > 1000 && liftedIndex !== undefined && liftedIndex < -2) ||
      (cape !== undefined && cape > 2000);

    if (thunderstormLikely) {
      const intensity =
        cape > 2500 ? "alta" : cape > 1500 ? "moderada" : "baja";
      return {
        active: true,
        level: cape > 2500 ? "precaucion" : "info",
        nearestStrikeKm: null,
        strikeCount: 0,
        strikes: [],
        lastCheckedAt: new Date().toISOString(),
        source: "openmeteo_fallback",
        message: `Inestabilidad convectiva ${intensity} (CAPE ${Math.round(cape)} J/kg). Actividad tormentosa posible.`,
      };
    }

    return {
      active: false,
      level: "info",
      nearestStrikeKm: null,
      strikeCount: 0,
      strikes: [],
      lastCheckedAt: new Date().toISOString(),
      source: "openmeteo_fallback",
      message: "Sin actividad tormentosa significativa según Open-Meteo",
    };
  } catch {
    return null;
  }
}

export async function fetchLightningData(
  lat: number = HUESCAR_COORDS.lat,
  lon: number = HUESCAR_COORDS.lon,
  radiusKm?: number
): Promise<LightningData> {
  const effectiveRadius = radiusKm ?? 50;
  const cacheKey = `${CACHE_KEY}:${lat.toFixed(4)}:${lon.toFixed(4)}:${effectiveRadius}`;
  const cached = cacheGet<LightningData>(cacheKey);
  if (cached) return cached;

  const blitzortungStrikes = await fetchBlitzortung(lat, lon, effectiveRadius);

  if (blitzortungStrikes !== null) {
    const nearestStrikeKm =
      blitzortungStrikes.length > 0
        ? Math.min(...blitzortungStrikes.map((s) => s.distanceKm))
        : null;
    const level =
      nearestStrikeKm !== null ? getLevel(nearestStrikeKm) : "info";

    const result: LightningData = {
      active: blitzortungStrikes.length > 0,
      level,
      nearestStrikeKm,
      strikeCount: blitzortungStrikes.length,
      strikes: blitzortungStrikes,
      lastCheckedAt: new Date().toISOString(),
      source: "blitzortung",
      message:
        blitzortungStrikes.length > 0
          ? `${blitzortungStrikes.length} rayos detectados, el más cercano a ${nearestStrikeKm} km`
          : "No se detectaron rayos en el área",
    };

    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  const fallback = await fetchOpenMeteoCapeFallback(lat, lon);
  if (fallback) {
    cacheSet(cacheKey, fallback, CACHE_TTL_MS);
    return fallback;
  }

  return {
    active: false,
    level: "info",
    nearestStrikeKm: null,
    strikeCount: 0,
    strikes: [],
    lastCheckedAt: new Date().toISOString(),
    source: "unavailable",
    message: "Detección de rayos no disponible temporalmente",
  };
}
