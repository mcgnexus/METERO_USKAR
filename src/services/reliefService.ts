import { HUESCAR_URBAN_CENTER } from "@/lib/geo";

export type MicroclimateType = "VALLEY" | "PIEDMONT" | "EXPOSED_PLATEAU" | "MIXED_RELIEF";

export interface ReliefData {
  centerElevation: number;
  minElevation: number;
  maxElevation: number;
  elevationRange: number;
  valleyExposure: number;
  microclimate: MicroclimateType;
  slopePct: number;
  aspect: string;
  aspectDeg: number;
  grid: number[][];
}

const GRID_SPACING = 0.036;

function buildGridPoints(lat: number, lon: number): { lat: number; lon: number }[] {
  const points: { lat: number; lon: number }[] = [];
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      points.push({ lat: lat + row * GRID_SPACING, lon: lon + col * GRID_SPACING });
    }
  }
  return points;
}

async function fetchElevationGrid(lat: number, lon: number): Promise<number[][]> {
  const points = buildGridPoints(lat, lon);
  const lats = points.map((p) => p.lat.toFixed(4)).join(",");
  const lons = points.map((p) => p.lon.toFixed(4)).join(",");
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lons}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Elevation API error: ${response.status}`);
  const data = await response.json();
  if (!data.elevation || data.elevation.length < 9) throw new Error("Incomplete elevation response");
  const grid: number[][] = [];
  for (let row = 0; row < 3; row++) {
    grid.push(data.elevation.slice(row * 3, row * 3 + 3));
  }
  return grid;
}

function classifyRelief(grid: number[][], centerElev: number): ReliefData {
  const all = grid.flat();
  const minElev = Math.min(...all);
  const maxElev = Math.max(...all);
  const range = maxElev - minElev;
  const valleyExposure = range > 0 ? 1 - (centerElev - minElev) / range : 0.5;

  let microclimate: MicroclimateType;
  if (valleyExposure >= 0.6) {
    microclimate = "VALLEY";
  } else if (range >= 450) {
    microclimate = "PIEDMONT";
  } else if (valleyExposure <= -0.5 && range < 300) {
    microclimate = "EXPOSED_PLATEAU";
  } else {
    microclimate = "MIXED_RELIEF";
  }

  const centerCol = grid[1][1];
  const dx = grid[1][2] - grid[1][0];
  const dy = grid[0][1] - grid[2][1];
  const slope = dx !== 0 || dy !== 0 ? (Math.sqrt(dx * dx + dy * dy) / (GRID_SPACING * 111320)) * 100 : 0;
  const aspectDeg = dy !== 0 || dx !== 0 ? ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360 : 0;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const aspect = dirs[Math.round(aspectDeg / 45) % 8];

  return {
    centerElevation: centerElev,
    minElevation: minElev,
    maxElevation: maxElev,
    elevationRange: range,
    valleyExposure: Math.round(valleyExposure * 100) / 100,
    microclimate,
    slopePct: Math.round(slope * 10) / 10,
    aspect,
    aspectDeg: Math.round(aspectDeg),
    grid,
  };
}

let cachedRelief: ReliefData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function getReliefData(lat: number = HUESCAR_URBAN_CENTER.lat, lon: number = HUESCAR_URBAN_CENTER.lon): Promise<ReliefData> {
  if (cachedRelief && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRelief;
  }
  const grid = await fetchElevationGrid(lat, lon);
  const centerElev = grid[1][1];
  const relief = classifyRelief(grid, centerElev);
  cachedRelief = relief;
  cacheTimestamp = Date.now();
  return relief;
}

export function getRelief(): ReliefData | null {
  return cachedRelief;
}

export function getNightInversion(tempC: number, windKmh: number, isNight: boolean, relief: ReliefData): number {
  if (relief.microclimate !== "VALLEY" && relief.microclimate !== "MIXED_RELIEF") return 0;
  if (!isNight) return 0;
  if (windKmh > 5) return 0;

  if (relief.microclimate === "VALLEY") return -1.5;
  return -0.5;
}

export function getWindFactor(relief: ReliefData): number {
  switch (relief.microclimate) {
    case "EXPOSED_PLATEAU": return 1.2;
    case "PIEDMONT": return 1.0;
    case "VALLEY": return 0.7;
    case "MIXED_RELIEF": return 0.9;
    default: return 1.0;
  }
}
