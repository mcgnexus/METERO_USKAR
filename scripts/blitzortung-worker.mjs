import WebSocket from "ws";
import { Pool } from "@neondatabase/serverless";

const LAT = Number(process.env.LIGHTNING_LAT ?? 37.8094);
const LON = Number(process.env.LIGHTNING_LON ?? -2.5392);
const RADIUS_KM = Number(process.env.LIGHTNING_RADIUS_KM ?? 50);
const SERVERS = ["ws8", "ws7", "ws2", "ws1"].map((server) => `wss://${server}.blitzortung.org`);
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

function lzwDecode(compressed) {
  const dictionary = {};
  const data = compressed.split("");
  if (data.length === 0) return "";
  let current = data[0];
  let previous = current;
  const output = [current];
  let code = 256;

  for (let index = 1; index < data.length; index += 1) {
    const currentCode = data[index].charCodeAt(0);
    const phrase = currentCode < 256
      ? data[index]
      : (dictionary[currentCode] ?? previous + current);
    output.push(phrase);
    current = phrase.charAt(0);
    dictionary[code] = previous + current;
    code += 1;
    previous = phrase;
  }
  return output.join("");
}

function decodeStrike(data) {
  const raw = Buffer.isBuffer(data) ? data.toString("utf8") : data;
  if (typeof raw !== "string") return null;
  try {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(lzwDecode(raw));
    }
    if (parsed && typeof parsed.lat === "number" && typeof parsed.lon === "number") {
      const rawTime = typeof parsed.time === "number" ? parsed.time : parsed.timestamp;
      const time = typeof rawTime === "number"
        ? new Date(rawTime < 1_000_000_000_000
          ? rawTime * 1_000
          : rawTime < 1_000_000_000_000_000 ? rawTime : rawTime / 1_000)
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
    socket.send(JSON.stringify({ a: 111 }));
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
