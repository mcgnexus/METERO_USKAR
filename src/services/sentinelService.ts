import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const TOKEN_CACHE_KEY = "sentinel_token";
const TOKEN_TTL_MS = 50 * 60 * 1000;
const NDVI_CACHE_PREFIX = "sentinel_ndvi:";
const NDVI_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let tokenPromise: Promise<string | null> | null = null;

async function getToken(): Promise<string | null> {
  const cached = cacheGet<string>(TOKEN_CACHE_KEY);
  if (cached) return cached;

  if (tokenPromise) return tokenPromise;

  const clientId = process.env.SENTINEL_HUB_CLIENT_ID;
  const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  tokenPromise = (async () => {
    try {
      const res = await fetch("https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const token = data.access_token;
      if (token) cacheSet(TOKEN_CACHE_KEY, token, TOKEN_TTL_MS);
      return token ?? null;
    } catch {
      return null;
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

const EVALSCRIPT = `//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "B03", "SCL", "dataMask"],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndwi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  if (!s.dataMask || [3, 8, 9, 10, 11].includes(s.SCL)) {
    return { ndvi: [NaN], ndwi: [NaN], dataMask: [0] };
  }
  let ndvi = (s.B08 - s.B04) / (s.B08 + s.B04);
  let ndwi = (s.B03 - s.B08) / (s.B03 + s.B08);
  return { ndvi: [ndvi], ndwi: [ndwi], dataMask: [1] };
}`;

export interface VegetationIndices {
  ndvi: number | null;
  ndwi: number | null;
  coverage: string | null;
}

export async function fetchVegetationIndices(lat: number, lon: number): Promise<VegetationIndices> {
  const cacheKey = `${NDVI_CACHE_PREFIX}${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = cacheGet<VegetationIndices>(cacheKey);
  if (cached) return cached;

  const token = await getToken();
  if (!token) return { ndvi: null, ndwi: null, coverage: null };

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const fmt = (d: Date) => d.toISOString().split("T")[0] + "T00:00:00Z";

  const body = {
    input: {
      bounds: {
        bbox: [lon - 0.02, lat - 0.02, lon + 0.02, lat + 0.02],
        properties: { crs: "http://www.opengis.net/def/crs/OGC/1.3/CRS84" },
      },
      data: [{
        type: "sentinel-2-l2a",
        dataFilter: {
          mosaickingOrder: "leastCC",
          maxCloudCoverage: 80,
          timeRange: { from: fmt(startDate), to: fmt(endDate) },
        },
      }],
    },
    aggregation: {
      timeRange: { from: fmt(startDate), to: fmt(endDate) },
      aggregationInterval: { of: "P10D" },
      evalscript: EVALSCRIPT,
    },
  };

  try {
    const res = await fetch("https://sh.dataspace.copernicus.eu/api/v1/statistics", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return { ndvi: null, ndwi: null, coverage: null };
    const data = await res.json();

    const intervals = data?.data ?? [];
    let bestNdvi: number | null = null;
    let bestNdwi: number | null = null;

    for (const interval of intervals) {
      const ndviMean = interval?.outputs?.ndvi?.bands?.B0?.stats?.mean;
      const ndwiMean = interval?.outputs?.ndwi?.bands?.B0?.stats?.mean;
      if (typeof ndviMean === "number" && !isNaN(ndviMean)) {
        bestNdvi = ndviMean;
      }
      if (typeof ndwiMean === "number" && !isNaN(ndwiMean)) {
        bestNdwi = ndwiMean;
      }
    }

    let coverage: string | null = null;
    if (bestNdvi !== null) {
      if (bestNdvi > 0.6) coverage = "densa";
      else if (bestNdvi > 0.4) coverage = "moderada";
      else if (bestNdvi > 0.2) coverage = "escasa";
      else coverage = "desnuda";
    }

    const result: VegetationIndices = {
      ndvi: bestNdvi !== null ? Math.round(bestNdvi * 1000) / 1000 : null,
      ndwi: bestNdwi !== null ? Math.round(bestNdwi * 1000) / 1000 : null,
      coverage,
    };

    cacheSet(cacheKey, result, NDVI_CACHE_TTL_MS);
    return result;
  } catch {
    return { ndvi: null, ndwi: null, coverage: null };
  }
}
