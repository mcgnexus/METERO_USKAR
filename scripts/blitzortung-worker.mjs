import WebSocket from "ws";
import { Pool } from "@neondatabase/serverless";

const LAT = Number(process.env.LIGHTNING_LAT ?? 37.8094);
const LON = Number(process.env.LIGHTNING_LON ?? -2.5392);
const RADIUS_KM = Number(process.env.LIGHTNING_RADIUS_KM ?? 50);
const SERVERS = Array.from({ length: 8 }, (_, index) => `wss://ws${index + 1}.blitzortung.org:3000/`);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function distanceKm(lat1, lon1, lat2, lon2) {
  const radians = (value) => value * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearing(lat1, lon1, lat2, lon2) {
  const radians = (value) => value * Math.PI / 180;
  const degrees = (value) => (value * 180 / Math.PI + 360) % 360;
  const y = Math.sin(radians(lon2 - lon1)) * Math.cos(radians(lat2));
  const x = Math.cos(radians(lat1)) * Math.sin(radians(lat2))
    - Math.sin(radians(lat1)) * Math.cos(radians(lat2)) * Math.cos(radians(lon2 - lon1));
  return degrees(Math.atan2(y, x));
}

function decodeStrike(data) {
  if (Buffer.isBuffer(data) && data.length >= 12) {
    const lat = data.readInt32LE(0) / 1_000_000;
    const lon = data.readInt32LE(4) / 1_000_000;
    const timestamp = data.readUInt32LE(8);
    if (Number.isFinite(lat) && Number.isFinite(lon) && timestamp > 0) {
      return { lat, lon, time: new Date(timestamp * 1000) };
    }
  }

  if (typeof data !== "string") return null;
  try {
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed) && parsed.length >= 3
      && typeof parsed[0] === "number" && typeof parsed[1] === "number" && typeof parsed[2] === "number") {
      return { lat: parsed[1], lon: parsed[2], time: new Date(parsed[0] * 1000) };
    }
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number") {
      const rawTime = typeof parsed.time === "number" ? parsed.time : parsed.timestamp;
      const time = typeof rawTime === "number"
        ? new Date(rawTime < 1_000_000_000_000 ? rawTime * 1000 : rawTime)
        : new Date();
      return { lat: parsed.lat, lon: parsed.lon, time };
    }
  } catch {}
  return null;
}

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lightning_strikes (
      id BIGSERIAL PRIMARY KEY,
      strike_time TIMESTAMPTZ NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      distance_km DOUBLE PRECISION NOT NULL,
      bearing DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (strike_time, latitude, longitude)
    );
    CREATE INDEX IF NOT EXISTS lightning_strikes_time_idx ON lightning_strikes (strike_time DESC);
    CREATE TABLE IF NOT EXISTS lightning_collector_status (
      collector_name TEXT PRIMARY KEY,
      last_seen_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function touchHeartbeat() {
  await pool.query(`
    INSERT INTO lightning_collector_status (collector_name, last_seen_at, updated_at)
    VALUES ('blitzortung', NOW(), NOW())
    ON CONFLICT (collector_name) DO UPDATE SET last_seen_at = NOW(), updated_at = NOW()
  `);
}

async function saveStrike(strike) {
  const distance = distanceKm(LAT, LON, strike.lat, strike.lon);
  if (distance > RADIUS_KM) return;
  await pool.query(`
    INSERT INTO lightning_strikes (strike_time, latitude, longitude, distance_km, bearing)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (strike_time, latitude, longitude) DO NOTHING
  `, [strike.time.toISOString(), strike.lat, strike.lon, Math.round(distance * 10) / 10, bearing(LAT, LON, strike.lat, strike.lon)]);
}

async function pruneStrikes() {
  await pool.query("DELETE FROM lightning_strikes WHERE strike_time < NOW() - INTERVAL '2 hours'");
}

let serverIndex = 0;
let socket;
let heartbeatTimer;
let reconnectTimer;

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, 5000);
}

function connect() {
  const url = SERVERS[serverIndex++ % SERVERS.length];
  console.log(`[blitzortung] connecting ${url}`);
  socket = new WebSocket(url);

  socket.once("open", async () => {
    console.log(`[blitzortung] connected ${url}`);
    socket.send(JSON.stringify({ a: 1 }));
    await touchHeartbeat().catch((error) => console.error("[db] heartbeat", error.message));
    heartbeatTimer = setInterval(() => touchHeartbeat().catch((error) => console.error("[db] heartbeat", error.message)), 30_000);
  });

  socket.on("message", (data) => {
    const strike = decodeStrike(data);
    if (strike) saveStrike(strike).catch((error) => console.error("[db] strike", error.message));
  });

  socket.once("error", (error) => console.error(`[blitzortung] ${url}`, error.message));
  socket.once("close", () => {
    clearInterval(heartbeatTimer);
    console.log(`[blitzortung] disconnected ${url}`);
    scheduleReconnect();
  });
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

await ensureSchema();
await pruneStrikes();
setInterval(() => pruneStrikes().catch((error) => console.error("[db] prune", error.message)), 10 * 60_000);
connect();

async function shutdown() {
  clearInterval(heartbeatTimer);
  clearTimeout(reconnectTimer);
  socket?.close();
  await pool.end();
  process.exit(0);
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
