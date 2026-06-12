import { HUESCAR_COORDS, COMARCA_LOCATIONS, haversineKm } from "@/lib/geo";
import { fetchArchiveData } from "@/services/openMeteoArchiveClient";
import type { ComarcaEstimation } from "@/types/weather";

const ARCHIVE_DAYS = 45;
const TREND_WEIGHT_BASE = 0.6;
const TREND_AGE_DECAY = 0.08;
const DISTANCE_DECAY = 0.03;

function computeTrend(archiveDays: { date: string; temperatureMean: number }[]): {
  slope: number;
  conf: number;
} {
  if (archiveDays.length < 7) return { slope: 0, conf: 0 };
  const n = archiveDays.length;
  const indices = archiveDays.map((_, i) => i);
  const temps = archiveDays.map((d) => d.temperatureMean);
  const meanIdx = indices.reduce((a, b) => a + b, 0) / n;
  const meanTemp = temps.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (indices[i] - meanIdx) * (temps[i] - meanTemp);
    den += (indices[i] - meanIdx) * (indices[i] - meanIdx);
  }
  const slope = den !== 0 ? num / den : 0;
  const residuals = temps.map((t, i) => Math.pow(t - (meanTemp + slope * (indices[i] - meanIdx)), 2));
  const mse = residuals.reduce((a, b) => a + b, 0) / n;
  const se = Math.sqrt(mse / den);
  const tStat = Math.abs(slope / (se || 1));
  const conf = Math.min(1, tStat / 2);
  return { slope, conf };
}

export async function fetchComarcaLayer(
  aemetTemp: number | null,
  aemetHumidity: number | null,
  aemetTime: Date | null
): Promise<ComarcaEstimation[] | null> {
  try {
    const anchorArchive = await fetchArchiveData(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, ARCHIVE_DAYS);
    if (anchorArchive.length === 0) return null;

    const trend = computeTrend(anchorArchive);

    const todayStr = new Date().toISOString().split("T")[0];
    const anchorToday = anchorArchive.find((d) => d.date === todayStr);

    const estimations: ComarcaEstimation[] = [];

    for (const loc of COMARCA_LOCATIONS) {
      const locArchive = await fetchArchiveData(loc.lat, loc.lon, ARCHIVE_DAYS);
      const locToday = locArchive.find((d) => d.date === todayStr);

      const spatialDeltaTemp = locToday && anchorToday
        ? locToday.temperatureMean - anchorToday.temperatureMean
        : 0;
      const spatialDeltaHum = locToday && anchorToday
        ? locToday.humidityMean - anchorToday.humidityMean
        : 0;
      const spatialDeltaPrecip = locToday && anchorToday
        ? locToday.precipitationSum - anchorToday.precipitationSum
        : 0;
      const spatialDeltaWind = locToday && anchorToday
        ? locToday.windSpeedMean - anchorToday.windSpeedMean
        : 0;

      if (aemetTemp !== null && aemetTime !== null) {
        const ageDays = (Date.now() - aemetTime.getTime()) / (1000 * 86400);
        const trendWeight = TREND_WEIGHT_BASE * Math.max(0, 1 - ageDays * TREND_AGE_DECAY);

        const tempEst = aemetTemp + spatialDeltaTemp + trend.slope * trendWeight;
        const humEst = (aemetHumidity ?? 50) + spatialDeltaHum;
        const precipEst = 0 + spatialDeltaPrecip;
        const windEst = 0 + spatialDeltaWind;

        const distanceKm = haversineKm(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, loc.lat, loc.lon);
        const confAnchor = 0.5;
        const confTrend = trend.conf;
        const factorDistance = Math.max(0, 1 - distanceKm * DISTANCE_DECAY);
        const confidencePct = Math.round((confAnchor + confTrend) * factorDistance * 100);

        estimations.push({
          location: loc.name,
          latitude: loc.lat,
          longitude: loc.lon,
          elevation: loc.elevation,
          temperatureC: Math.round(tempEst * 10) / 10,
          humidityPct: Math.round(humEst),
          precipitationMm: Math.round(precipEst * 10) / 10,
          windSpeedKmh: Math.round(windEst * 10) / 10,
          confidencePct,
        });
      } else {
        const archiveVal = locToday?.temperatureMean ?? 0;
        const tempEst = archiveVal + spatialDeltaTemp;

        const distanceKm = haversineKm(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, loc.lat, loc.lon);
        const confAnchor = 0.3;
        const confTrend = trend.conf;
        const factorDistance = Math.max(0, 1 - distanceKm * DISTANCE_DECAY);
        const confidencePct = Math.round((confAnchor + confTrend) * factorDistance * 100);

        estimations.push({
          location: loc.name,
          latitude: loc.lat,
          longitude: loc.lon,
          elevation: loc.elevation,
          temperatureC: Math.round(tempEst * 10) / 10,
          humidityPct: 0,
          precipitationMm: 0,
          windSpeedKmh: 0,
          confidencePct,
        });
      }
    }

    return estimations;
  } catch {
    return null;
  }
}
