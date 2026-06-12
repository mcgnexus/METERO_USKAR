import WebSocket from "ws";
import { haversineKm, bearing, HUESCAR_COORDS } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { LightningData, LightningStrike } from "@/types/weather";

const CACHE_KEY = "lightning_data";
const CACHE_TTL_MS = 120_000;
const COLLECT_MS = 3000;
const BLITZORTUNG_SERVERS = Array.from({ length: 8 }, (_, i) => `wss://ws${i + 1}.blitzortung.org:3000/`);

function decodeBlitzortungPacket(raw: Buffer): { lat: number; lon: number; time: Date } | null {
  try {
    const str = raw.toString("base64");
    const reversed = str.split("").reverse().join("");
    const rotated = reversed.replace(/[a-zA-Z]/g, (c) => {
      const code = c.charCodeAt(0);
      const base = c >= "a" ? 97 : 65;
      return String.fromCharCode(((code - base + 13) % 26) + base);
    });
    const b64clean = rotated.replace(/[^A-Za-z0-9+/=]/g, "");
    const buf = Buffer.from(b64clean, "base64");
    if (buf.length < 12) return null;
    const lat = buf.readInt32LE(0) / 1_000_000;
    const lon = buf.readInt32LE(4) / 1_000_000;
    const ts = buf.readUInt32LE(8);
    return { lat, lon, time: new Date(ts * 1000) };
  } catch {
    return null;
  }
}

function getLevel(distanceKm: number): LightningData["level"] {
  if (distanceKm < 5) return "peligro";
  if (distanceKm < 15) return "alerta";
  if (distanceKm < 30) return "precaucion";
  return "info";
}

export async function fetchLightningData(
  lat: number = HUESCAR_COORDS.lat,
  lon: number = HUESCAR_COORDS.lon,
  radiusKm?: number
): Promise<LightningData> {
  const cached = cacheGet<LightningData>(CACHE_KEY);
  if (cached) return cached;

  const effectiveRadius = radiusKm ?? 50;
  const strikes: LightningStrike[] = [];
  const server = BLITZORTUNG_SERVERS[Math.floor(Math.random() * BLITZORTUNG_SERVERS.length)];

  try {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(server);
      const timeout = setTimeout(() => {
        ws.close();
        resolve();
      }, COLLECT_MS);

      ws.on("open", () => {
        ws.send(JSON.stringify({ a: 1 }));
      });

      ws.on("message", (data: Buffer) => {
        const decoded = decodeBlitzortungPacket(data);
        if (!decoded) return;
        const distanceKm = haversineKm(lat, lon, decoded.lat, decoded.lon);
        if (distanceKm > effectiveRadius) return;
        strikes.push({
          time: decoded.time.toISOString(),
          lat: decoded.lat,
          lon: decoded.lon,
          distanceKm: Math.round(distanceKm * 10) / 10,
          bearing: bearing(lat, lon, decoded.lat, decoded.lon),
        });
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      ws.on("close", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  } catch {
    const result: LightningData = {
      active: false,
      level: "info",
      nearestStrikeKm: null,
      strikeCount: 0,
      strikes: [],
      lastCheckedAt: new Date().toISOString(),
      source: "unavailable",
      message: "No se pudo conectar con Blitzortung",
    };
    return result;
  }

  const nearestStrikeKm = strikes.length > 0
    ? Math.min(...strikes.map((s) => s.distanceKm))
    : null;
  const level = nearestStrikeKm !== null ? getLevel(nearestStrikeKm) : "info";

  const result: LightningData = {
    active: strikes.length > 0,
    level,
    nearestStrikeKm,
    strikeCount: strikes.length,
    strikes,
    lastCheckedAt: new Date().toISOString(),
    source: "blitzortung",
    message: strikes.length > 0
      ? `${strikes.length} rayos detectados, el más cercano a ${nearestStrikeKm} km`
      : "No se detectaron rayos en el área",
  };

  cacheSet(CACHE_KEY, result, CACHE_TTL_MS);
  return result;
}
