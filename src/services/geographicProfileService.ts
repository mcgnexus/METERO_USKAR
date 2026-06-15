import { COMARCA_LOCATIONS } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import { fetchVegetationIndices } from "@/services/sentinelService";
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
  // Se delega en sentinelService, que usa el endpoint CDSE moderno y un
  // evalscript correcto (NDVI = (B08-B04)/(B08+B04)). La implementación
  // anterior usaba el endpoint legacy services.sentinel-hub.com con un
  // evalscript que invertía el signo del NDVI y un parseo de respuesta roto.
  const result = await fetchVegetationIndices(lat, lon);
  return { ndvi: result.ndvi, ndwi: result.ndwi };
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
