import { haversineKm } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const CACHE_PREFIX = "osm_water:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface WaterBody {
  distanceKm: number;
  type: string;
  name: string | null;
  weight: number;
}

const KNOWN_SPRINGS = [
  { name: "Fuencaliente", lat: 37.801980717778704, lon: -2.5223947364766244 },
];

const KNOWN_RESERVOIRS = [
  { name: "Pantano de San Clemente", lat: 37.860763009894654, lon: -2.6497118917245626 },
];

const TYPE_WEIGHTS: Record<string, number> = {
  spring: 1.0,
  water: 0.8,
  canal: 0.6,
  river: 0.3,
  ditch: 0.2,
  stream: 0.0,
  barranco: 0.0,
  arroyo: 0.0,
};

function getWeight(tags: Record<string, string>): number {
  if (tags.intermittent === "yes" || tags.seasonal === "yes" || tags.dry === "yes") return 0;
  if (tags.waterway === "stream" || tags.waterway === "ditch") {
    if (tags.intermittent !== "no") return 0;
  }
  if (tags.waterway === "river" && tags.name === "Río Huéscar") return 0.1;
  const type = tags.waterway || tags.water || tags.natural || "unknown";
  return TYPE_WEIGHTS[type] ?? 0.1;
}

export async function fetchWaterBodies(lat: number, lon: number, radiusM: number = 5000): Promise<WaterBody[]> {
  const cacheKey = `${CACHE_PREFIX}${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = cacheGet<WaterBody[]>(cacheKey);
  if (cached) return cached;

  const query = `
[out:json][timeout:15];
(
  way["natural"="water"](around:${radiusM},${lat},${lon});
  relation["natural"="water"](around:${radiusM},${lat},${lon});
  way["waterway"](around:${radiusM},${lat},${lon});
  node["natural"="spring"](around:${radiusM},${lat},${lon});
);
out center tags;`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "METERO-USKAR/1.0 (meteorological observatory)",
      },
      body: "data=" + encodeURIComponent(query),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const elements = data?.elements ?? [];

    const results: WaterBody[] = [];
    for (const el of elements) {
      const elLat = el.center?.lat ?? el.lat;
      const elLon = el.center?.lon ?? el.lon;
      if (elLat === undefined || elLon === undefined) continue;

      const tags = el.tags ?? {};
      const weight = getWeight(tags);
      if (weight === 0) continue;

      const dist = haversineKm(lat, lon, elLat, elLon);
      let type = "agua";
      if (tags.natural === "spring") type = "spring";
      else if (tags.waterway) type = tags.waterway;
      else if (tags.water) type = tags.water;
      else if (tags.natural === "water") type = "masa_agua";

      results.push({
        distanceKm: Math.round(dist * 100) / 100,
        type,
        name: tags.name ?? null,
        weight,
      });
    }

    for (const spring of KNOWN_SPRINGS) {
      const dist = haversineKm(lat, lon, spring.lat, spring.lon);
      if (dist <= radiusM / 1000) {
        results.push({
          distanceKm: Math.round(dist * 100) / 100,
          type: "spring",
          name: spring.name,
          weight: 1.0,
        });
      }
    }

    for (const reservoir of KNOWN_RESERVOIRS) {
      const dist = haversineKm(lat, lon, reservoir.lat, reservoir.lon);
      if (dist <= radiusM / 1000) {
        results.push({
          distanceKm: Math.round(dist * 100) / 100,
          type: "reservoir",
          name: reservoir.name,
          weight: 0.9,
        });
      }
    }

    results.sort((a, b) => b.weight - a.weight || a.distanceKm - b.distanceKm);
    const top = results.slice(0, 10);
    cacheSet(cacheKey, top, CACHE_TTL_MS);
    return top;
  } catch {
    return [];
  }
}
