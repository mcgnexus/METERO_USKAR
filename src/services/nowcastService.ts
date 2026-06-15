import { haversineKm, bearing, toRad, toDeg } from "@/lib/geo";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { LightningData } from "@/types/weather";

export interface NowcastInterval {
  time: string;
  precipMm: number;
}

export interface NowcastData {
  intervals: NowcastInterval[];
  totalPrecipNext2h: number;
  maxIntensityMm: number;
  minutesToRain: number | null;
  minutesToEndRain: number | null;
  trajectory: "increasing" | "decreasing" | "stable" | "none";
  rainApproachingFrom: string | null;
  stormDetected: boolean;
  stormDistanceKm: number | null;
  stormBearing: string | null;
  level: "ninguno" | "aviso" | "alerta" | "peligro";
  message: string;
  lastUpdated: string;
}

const CACHE_KEY = "nowcast_precip";
const CACHE_TTL_MS = 8 * 60 * 1000;

function getLevel(maxIntensity: number, storm: boolean): NowcastData["level"] {
  if (storm && maxIntensity > 2.0) return "peligro";
  if (maxIntensity > 4.0) return "peligro";
  if (maxIntensity > 1.5) return "alerta";
  if (maxIntensity > 0.1) return "aviso";
  return "ninguno";
}

function getTrajectory(
  intervals: NowcastInterval[]
): NowcastData["trajectory"] {
  if (intervals.length < 4) return "none";
  const firstHalf = intervals.slice(0, Math.floor(intervals.length / 2));
  const secondHalf = intervals.slice(Math.floor(intervals.length / 2));
  const avgFirst = firstHalf.reduce((s, i) => s + i.precipMm, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, i) => s + i.precipMm, 0) / secondHalf.length;

  if (avgFirst < 0.1 && avgSecond < 0.1) return "none";
  if (avgSecond > avgFirst * 1.3) return "increasing";
  if (avgFirst > avgSecond * 1.3) return "decreasing";
  return "stable";
}

function inferApproachDirection(
  lat: number,
  lon: number,
  windDirDeg: number | undefined
): string | null {
  if (windDirDeg === undefined) return null;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(windDirDeg / 45) % 8;
  return dirs[index];
}

export async function fetchNowcast(
  lat: number,
  lon: number,
  windDirDeg: number | undefined,
  lightning: LightningData | null
): Promise<NowcastData> {
  const cached = cacheGet<NowcastData>(CACHE_KEY);
  if (cached) return cached;

  const intervals: NowcastInterval[] = [];
  let totalPrecip = 0;
  let maxIntensity = 0;
  let minutesToRain: number | null = null;
  let minutesToEndRain: number | null = null;
  let stormDetected = false;
  let stormDistanceKm: number | null = null;
  let stormBearing: string | null = null;
  let fetchSucceeded = false;

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&minutely_15=precipitation` +
      `&forecast_days=1&timezone=auto`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const data = await res.json();
      const minutely = data.minutely_15;

      if (minutely && Array.isArray(minutely.precipitation)) {
        const times = minutely.time as string[];
        const precip = minutely.precipitation as number[];

        const count = Math.min(8, precip.length);

        for (let i = 0; i < count; i++) {
          const mm = precip[i] ?? 0;
          intervals.push({ time: times[i], precipMm: mm });
          totalPrecip += mm;
          if (mm > maxIntensity) maxIntensity = mm;
          if (minutesToRain === null && mm > 0.1) {
            minutesToRain = (i + 1) * 15;
          }
        }

        if (minutesToRain !== null) {
          for (let i = count - 1; i >= 0; i--) {
            if ((precip[i] ?? 0) > 0.1) {
              minutesToEndRain = (i + 1) * 15;
              break;
            }
          }
        }
        fetchSucceeded = true;
      }
    }
  } catch {
  }

  if (lightning && lightning.active && lightning.nearestStrikeKm !== null && lightning.strikes.length > 0) {
    if (lightning.nearestStrikeKm < 30) {
      stormDetected = true;
      stormDistanceKm = lightning.nearestStrikeKm;
      const nearest = lightning.strikes.reduce((min, s) =>
        s.distanceKm < min.distanceKm ? s : min
      );
      stormBearing = nearest.bearing;
    }
  }

  const trajectory = getTrajectory(intervals);
  const rainApproachingFrom = totalPrecip > 0.1
    ? inferApproachDirection(lat, lon, windDirDeg)
    : null;

  const level = getLevel(maxIntensity, stormDetected);

  let message: string;
  if (level === "peligro") {
    if (stormDetected) {
      message = `Tormenta con rayos a ${stormDistanceKm} km (${stormBearing}). Lluvia intensa estimada en ${minutesToRain ?? "?"} min.`;
    } else {
      message = `Lluvia intensa estimada en ${minutesToRain} min (${maxIntensity.toFixed(1)} mm/15min).`;
    }
  } else if (level === "alerta") {
    message = stormDetected
      ? `Tormenta próxima (${stormDistanceKm} km). Precipitación moderada en ${minutesToRain ?? "?"} min.`
      : `Precipitaciones moderadas en ${minutesToRain} min.`;
  } else if (level === "aviso") {
    message = `Posibilidad de lluvia débil en ${minutesToRain} min.`;
  } else {
    message = stormDetected
      ? `Rayos detectados a ${stormDistanceKm} km (${stormBearing}), sin precipitación inminente.`
      : "Sin precipitación esperada en las próximas 2 horas.";
  }

  const result: NowcastData = {
    intervals,
    totalPrecipNext2h: Math.round(totalPrecip * 10) / 10,
    maxIntensityMm: Math.round(maxIntensity * 10) / 10,
    minutesToRain,
    minutesToEndRain,
    trajectory,
    rainApproachingFrom,
    stormDetected,
    stormDistanceKm,
    stormBearing,
    level,
    message,
    lastUpdated: new Date().toISOString(),
  };

  if (fetchSucceeded) {
    cacheSet(CACHE_KEY, result, CACHE_TTL_MS);
  }
  return result;
}
