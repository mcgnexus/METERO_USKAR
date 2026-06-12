import { COMARCA_LOCATIONS } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { GeographicProfile } from "@/types/weather";

const PROFILES_CACHE_TTL = 3600_000;
const PROFILES_CACHE_KEY = "geographic_profiles";

function classifyMicroclimate(elevation: number, valleyExposure: number): GeographicProfile["microclimate"] {
  if (elevation < 800 && valleyExposure > 0.6) return "VALLEY";
  if (elevation < 1000 && valleyExposure > 0.3) return "PIEDMONT";
  if (elevation > 1100 && valleyExposure < 0.3) return "EXPOSED_PLATEAU";
  return "MIXED_RELIEF";
}

function estimateValleyExposure(lat: number, lon: number): number {
  const h = Math.sin(lat) * Math.cos(lon);
  const v = Math.cos(lat) * Math.sin(lon);
  return Math.abs(Math.atan2(v, h)) / Math.PI;
}

async function fetchElevation(lat: number, lon: number): Promise<number> {
  try {
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.elevation?.[0] ?? 0;
  } catch {
    return 0;
  }
}

async function fetchWaterBodiesMock(lat: number, lon: number): Promise<{ distanceKm: number; type: string }[]> {
  const results: { distanceKm: number; type: string }[] = [];
  const candidates = [
    { lat: 37.85, lon: -2.55, type: "embalse" },
    { lat: 37.78, lon: -2.48, type: "rio" },
    { lat: 37.80, lon: -2.70, type: "embalse" },
    { lat: 37.75, lon: -2.60, type: "arroyo" },
    { lat: 37.82, lon: -2.52, type: "rio" },
  ];
  for (const c of candidates) {
    const d = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lon - c.lon, 2)) * 111;
    if (d < 20) {
      results.push({ distanceKm: Math.round(d * 10) / 10, type: c.type });
    }
  }
  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

async function fetchNDVINDWI(
  lat: number,
  lon: number
): Promise<{ ndvi: number | null; ndwi: number | null }> {
  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return { ndvi: null, ndwi: null };

  try {
    const tokenRes = await fetch(
      "https://services.sentinel-hub.com/oauth/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      }
    );
    if (!tokenRes.ok) return { ndvi: null, ndwi: null };
    const { access_token } = await tokenRes.json();

    const bbox = `${lon - 0.05},${lat - 0.05},${lon + 0.05},${lat + 0.05}`;
    const statsUrl = `https://services.sentinel-hub.com/api/v1/statistics`;
    const body = {
      input: {
        bounds: { bbox: [lon - 0.05, lat - 0.05, lon + 0.05, lat + 0.05] },
        data: [
          {
            type: "S2L2A",
            dataFilter: { maxCloudCoverage: 30 },
          },
        ],
      },
      aggregation: {
        timeRange: {
          from: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
          to: new Date().toISOString().split("T")[0],
        },
        evalscript: `
          return [index(B04, B08), index(B03, B08)];
        `,
        reducer: "mean",
      },
    };

    const statsRes = await fetch(statsUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!statsRes.ok) return { ndvi: null, ndwi: null };
    const statsData = await statsRes.json();
    const data = statsData?.data?.[0]?.outputs?.[0]?.bands?.[0]?.stats?.mean;
    if (!data || data.length < 2) return { ndvi: null, ndwi: null };
    return { ndvi: data[0], ndwi: data[1] };
  } catch {
    return { ndvi: null, ndwi: null };
  }
}

async function saveLocationProfile(profile: GeographicProfile): Promise<void> {
  const existing = cacheGet<GeographicProfile[]>(PROFILES_CACHE_KEY) || [];
  const idx = existing.findIndex((p) => p.locationId === profile.locationId);
  if (idx >= 0) existing[idx] = profile;
  else existing.push(profile);
  cacheSet(PROFILES_CACHE_KEY, existing, PROFILES_CACHE_TTL);
}

export async function generateGeographicProfiles(): Promise<void> {
  for (const loc of COMARCA_LOCATIONS) {
    const elevation = await fetchElevation(loc.lat, loc.lon);
    const valleyExposure = estimateValleyExposure(loc.lat, loc.lon);
    const microclimate = classifyMicroclimate(elevation, valleyExposure);
    const waterBodies = await fetchWaterBodiesMock(loc.lat, loc.lon);
    const { ndvi, ndwi } = await fetchNDVINDWI(loc.lat, loc.lon);

    const elevationRange = 50;
    const forestCover = 0.3;

    const profile: GeographicProfile = {
      locationId: loc.name,
      locationName: loc.name,
      latitude: loc.lat,
      longitude: loc.lon,
      elevation,
      elevationRange,
      valleyExposure: Math.round(valleyExposure * 100) / 100,
      microclimate,
      waterBodies,
      forestCover,
      ndvi,
      ndwi,
      generatedAt: new Date().toISOString(),
    };

    await saveLocationProfile(profile);
  }
}

export async function getGeographicProfile(locationId: string): Promise<GeographicProfile | null> {
  const profiles = cacheGet<GeographicProfile[]>(PROFILES_CACHE_KEY);
  if (!profiles) return null;
  return profiles.find((p) => p.locationId === locationId) ?? null;
}
