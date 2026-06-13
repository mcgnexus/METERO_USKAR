import { HUESCAR_COORDS, COMARCA_LOCATIONS, haversineKm } from "@/lib/geo";
import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastClient";
import { getReliefData } from "@/services/reliefService";
import { applyMicroclimateCorrections } from "@/services/correctionService";
import { applyOrographicPrecipitation } from "@/services/orographicService";
import { getVegetationData, applyVegetationCorrections } from "@/services/vegetationService";
import type { ComarcaEstimation, SourceObservation } from "@/types/weather";

const DISTANCE_DECAY = 0.03;

function computeConfidence(
  aemetAgeMinutes: number | null,
  distanceKm: number,
  hasRelief: boolean,
  hasForecast: boolean
): number {
  let conf = 0.8;

  if (aemetAgeMinutes !== null && aemetAgeMinutes > 120) {
    conf -= Math.min(0.3, (aemetAgeMinutes - 120) / 600);
  } else if (aemetAgeMinutes === null) {
    conf -= 0.3;
  }

  if (!hasRelief) conf -= 0.1;
  if (!hasForecast) conf -= 0.2;

  const factorDistance = Math.max(0, 1 - distanceKm * DISTANCE_DECAY);
  conf *= factorDistance;

  return Math.round(Math.max(25, Math.min(92, conf * 100)));
}

export async function fetchComarcaWeather(aemetObs: SourceObservation | null): Promise<ComarcaEstimation[]> {
  const anchorLat = HUESCAR_COORDS.lat;
  const anchorLon = HUESCAR_COORDS.lon;

  const anchorPromise = fetchOpenMeteoForecast(anchorLat, anchorLon, HUESCAR_COORDS.elevation)
    .then((r) => r.observations[0] ?? null)
    .catch(() => null);

  const locPromises = COMARCA_LOCATIONS.map(async (loc) => {
    const [forecast, relief, vegetation] = await Promise.all([
      fetchOpenMeteoForecast(loc.lat, loc.lon, loc.elevation)
        .then((r) => r.observations[0] ?? null)
        .catch(() => null),
      getReliefData(loc.lat, loc.lon).catch(() => null),
      getVegetationData(loc.lat, loc.lon).catch(() => null),
    ]);
    return { location: loc, forecast, relief, vegetation };
  });

  const [anchorObs, ...locResults] = await Promise.all([anchorPromise, ...locPromises]);

  const aemetAge = aemetObs
    ? (Date.now() - new Date(aemetObs.time).getTime()) / 60000
    : null;

  const estimations: ComarcaEstimation[] = [];

  for (const { location, forecast, relief, vegetation } of locResults) {
    const distanceKm = haversineKm(anchorLat, anchorLon, location.lat, location.lon);

    const spatialDeltaTemp = anchorObs && forecast
      ? forecast.temperatureC - anchorObs.temperatureC
      : 0;
    const spatialDeltaHum = anchorObs && forecast
      ? forecast.humidityPct - anchorObs.humidityPct
      : 0;
    const spatialDeltaWind = anchorObs && forecast
      ? forecast.windSpeedKmh - anchorObs.windSpeedKmh
      : 0;
    const spatialDeltaPrecip = anchorObs && forecast
      ? forecast.precipitationMm - anchorObs.precipitationMm
      : 0;

    const baseTemp = aemetObs
      ? aemetObs.temperatureC + spatialDeltaTemp
      : (forecast?.temperatureC ?? 0);
    const baseHum = aemetObs
      ? (aemetObs.humidityPct ?? 50) + spatialDeltaHum
      : (forecast?.humidityPct ?? 50);
    const baseWind = forecast?.windSpeedKmh ?? 0;
    const basePrecip = aemetObs
      ? (aemetObs.precipitationMm ?? 0) + spatialDeltaPrecip
      : (forecast?.precipitationMm ?? 0);

    const isNight = new Date().getHours() < 7 || new Date().getHours() >= 21;
    const corrected = applyMicroclimateCorrections(
      baseTemp,
      baseHum,
      baseWind,
      isNight,
      location.elevation,
      location.elevation,
      relief
    );

    const vegCorrections = applyVegetationCorrections(
      corrected.temperatureC,
      corrected.humidityPct,
      vegetation
    );

    const finalTemp = Math.round((corrected.temperatureC + vegCorrections.temperatureAdjustmentC) * 10) / 10;
    const finalHum = Math.min(100, Math.max(0, Math.round(corrected.humidityPct + vegCorrections.humidityAdjustmentPct)));

    const windDirForOro = forecast?.windDirectionDeg;
    const { precipMm: orographicPrecip, orographic } = applyOrographicPrecipitation(
      basePrecip,
      windDirForOro,
      relief
    );

    const confidence = computeConfidence(
      aemetAge,
      distanceKm,
      relief !== null,
      forecast !== null
    );

    estimations.push({
      location: location.name,
      latitude: location.lat,
      longitude: location.lon,
      elevation: location.elevation,
      temperatureC: finalTemp,
      rawTemperatureC: Math.round(baseTemp * 10) / 10,
      humidityPct: finalHum,
      precipitationMm: orographicPrecip,
      windSpeedKmh: corrected.windSpeedKmh,
      confidencePct: confidence,
      microclimate: relief?.microclimate,
      elevationRange: relief?.elevationRange,
      valleyExposure: relief?.valleyExposure,
      altitudeCorrectionC: corrected.corrections.altitudeCorrectionC,
      nightInversionC: corrected.corrections.nightInversionC,
      windFactor: corrected.corrections.windFactor,
      distanceToAnchorKm: Math.round(distanceKm * 10) / 10,
      orographicFactor: orographic.factor,
      orographicClass: orographic.classification,
      ndvi: vegetation?.ndvi ?? null,
      ndwi: vegetation?.ndwi ?? null,
      coverage: vegetation?.coverage ?? null,
      nearestWaterKm: vegetation?.nearestWaterKm ?? null,
      nearestWaterType: vegetation?.nearestWaterType ?? null,
      vegetationTempAdjC: vegCorrections.temperatureAdjustmentC || undefined,
      vegetationHumAdjPct: vegCorrections.humidityAdjustmentPct || undefined,
      vegetationDewShiftC: vegCorrections.dewPointShiftC || undefined,
    });
  }

  return estimations;
}
