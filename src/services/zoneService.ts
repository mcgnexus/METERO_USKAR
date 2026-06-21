import { HUESCAR_COORDS, HUESCAR_ZONES, haversineKm, type ZoneType } from "@/lib/geo";
import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastClient";
import { getReliefData } from "@/services/reliefService";
import { applyMicroclimateCorrections } from "@/services/correctionService";
import { applyOrographicPrecipitation } from "@/services/orographicService";
import { getVegetationData, applyVegetationCorrections } from "@/services/vegetationService";
import { dewPoint, relativeHumidity } from "@/lib/dewPoint";
import type { ZoneEstimation, SourceObservation } from "@/types/weather";

interface ZoneModifier {
  tempAdjC: number;
  humAdjPct: number;
  dewShiftC: number;
  irrigationNeedFactor: number;
  frostRiskBoost: number;
}

function getZoneModifier(type: ZoneType, isNight: boolean): ZoneModifier {
  switch (type) {
    case "URBAN":
      return {
        tempAdjC: isNight ? 1.2 : 0.6,
        humAdjPct: -3,
        dewShiftC: -0.2,
        irrigationNeedFactor: 1.0,
        frostRiskBoost: 0.4,
      };
    case "VEGA":
      return {
        tempAdjC: isNight ? -1.5 : -1.0,
        humAdjPct: 8,
        dewShiftC: 0.6,
        irrigationNeedFactor: 1.3,
        frostRiskBoost: -1.0,
      };
    case "SECANO":
      return {
        tempAdjC: isNight ? -0.5 : 0.8,
        humAdjPct: -5,
        dewShiftC: -0.4,
        irrigationNeedFactor: 1.5,
        frostRiskBoost: -0.4,
      };
    case "MONTE":
      return {
        tempAdjC: isNight ? -1.0 : -0.8,
        humAdjPct: 5,
        dewShiftC: 0.3,
        irrigationNeedFactor: 0.7,
        frostRiskBoost: -0.2,
      };
    case "RESERVOIR":
      return {
        tempAdjC: isNight ? -0.3 : -0.5,
        humAdjPct: 4,
        dewShiftC: 0.4,
        irrigationNeedFactor: 0.5,
        frostRiskBoost: 0.3,
      };
    default:
      return { tempAdjC: 0, humAdjPct: 0, dewShiftC: 0, irrigationNeedFactor: 1.0, frostRiskBoost: 0 };
  }
}

function computeFrostRisk(tempC: number, boost: number): ZoneEstimation["frostRisk"] {
  const adjusted = tempC + boost;
  if (adjusted < -4) return "muy_alta";
  if (adjusted < -1) return "alta";
  if (adjusted < 2) return "media";
  return "none";
}

function computeConfidence(
  distanceKm: number,
  hasRelief: boolean,
  hasForecast: boolean,
  aemetAvailable: boolean
): number {
  let conf = 0.85;
  if (!hasRelief) conf -= 0.08;
  if (!hasForecast) conf -= 0.15;
  if (!aemetAvailable) conf -= 0.1;
  conf *= Math.max(0.5, 1 - distanceKm * 0.02);
  return Math.round(Math.max(35, Math.min(95, conf * 100)));
}

export async function fetchZoneWeather(aemetObs: SourceObservation | null): Promise<ZoneEstimation[]> {
  const anchorLat = HUESCAR_COORDS.lat;
  const anchorLon = HUESCAR_COORDS.lon;

  const anchorPromise = fetchOpenMeteoForecast(anchorLat, anchorLon, HUESCAR_COORDS.elevation)
    .then((r) => r.observations[0] ?? null)
    .catch(() => null);

  const zonePromises = HUESCAR_ZONES.map(async (zone) => {
    const [forecast, relief, vegetation] = await Promise.all([
      fetchOpenMeteoForecast(zone.lat, zone.lon, zone.elevation)
        .then((r) => r.observations[0] ?? null)
        .catch(() => null),
      getReliefData(zone.lat, zone.lon).catch(() => null),
      getVegetationData(zone.lat, zone.lon).catch(() => null),
    ]);
    return { zone, forecast, relief, vegetation };
  });

  const [anchorObs, ...zoneResults] = await Promise.all([anchorPromise, ...zonePromises]);

  const hour = parseInt(
    new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).format(new Date()),
    10
  );
  const isNight = hour < 7 || hour >= 21;

  const estimations: ZoneEstimation[] = [];

  for (const { zone, forecast, relief, vegetation } of zoneResults) {
    const distanceKm = haversineKm(anchorLat, anchorLon, zone.lat, zone.lon);

    const spatialDeltaTemp = anchorObs && forecast
      ? forecast.temperatureC - anchorObs.temperatureC
      : 0;
    const spatialDeltaHum = anchorObs && forecast
      ? forecast.humidityPct - anchorObs.humidityPct
      : 0;
    const spatialDeltaWind = anchorObs && forecast
      ? forecast.windSpeedKmh - anchorObs.windSpeedKmh
      : 0;

    const baseTemp = aemetObs
      ? aemetObs.temperatureC + spatialDeltaTemp
      : (forecast?.temperatureC ?? 0);
    const baseHum = aemetObs
      ? (aemetObs.humidityPct ?? 50) + spatialDeltaHum
      : (forecast?.humidityPct ?? 50);
    const baseWind = forecast?.windSpeedKmh ?? 0;
    const basePrecip = aemetObs
      ? (aemetObs.precipitationMm ?? 0) + (anchorObs && forecast ? (forecast.precipitationMm - anchorObs.precipitationMm) : 0)
      : (forecast?.precipitationMm ?? 0);

    // Si hay observación AEMET, la temperatura base está anclada a la cota de Huéscar;
    // si no, la fuente es el pronóstico local (ya a la altitud de la zona).
    const sourceElevation = aemetObs ? HUESCAR_COORDS.elevation : zone.elevation;
    const corrected = applyMicroclimateCorrections(
      baseTemp,
      baseHum,
      baseWind,
      isNight,
      sourceElevation,
      zone.elevation,
      relief
    );

    const vegCorrections = applyVegetationCorrections(
      corrected.temperatureC,
      corrected.humidityPct,
      vegetation
    );

    const mod = getZoneModifier(zone.type, isNight);

    let finalTemp = corrected.temperatureC + vegCorrections.temperatureAdjustmentC + mod.tempAdjC;
    let finalDew = vegCorrections.dewPointShiftC + mod.dewShiftC;
    let finalHum: number;

    const tdBase = dewPoint(corrected.temperatureC, corrected.humidityPct);
    finalHum = relativeHumidity(finalTemp, tdBase + finalDew);
    finalHum = Math.min(100, Math.max(0, finalHum + vegCorrections.humidityAdjustmentPct + mod.humAdjPct));

    finalTemp = Math.round(finalTemp * 10) / 10;
    finalHum = Math.round(finalHum);

    const windDirForOro = forecast?.windDirectionDeg;
    const { precipMm: orographicPrecip } = applyOrographicPrecipitation(
      basePrecip,
      windDirForOro,
      relief
    );

    const confidence = computeConfidence(
      distanceKm,
      relief !== null,
      forecast !== null,
      aemetObs !== null
    );

    const frostRisk = computeFrostRisk(finalTemp, mod.frostRiskBoost);

    const et0Approx = Math.max(0, (finalTemp - 5) * 0.08 * mod.irrigationNeedFactor);
    const irrigationNeedMm = frostRisk === "none" && finalHum < 50
      ? Math.round(et0Approx * 10) / 10
      : undefined;

    estimations.push({
      name: zone.name,
      type: zone.type,
      description: zone.description,
      latitude: zone.lat,
      longitude: zone.lon,
      elevation: zone.elevation,
      temperatureC: finalTemp,
      humidityPct: finalHum,
      precipitationMm: orographicPrecip,
      windSpeedKmh: corrected.windSpeedKmh,
      confidencePct: confidence,
      distanceToCenterKm: Math.round(distanceKm * 10) / 10,
      microclimate: relief?.microclimate,
      zoneTempAdjC: Math.round(mod.tempAdjC * 100) / 100,
      zoneHumAdjPct: mod.humAdjPct,
      zoneDewShiftC: Math.round(mod.dewShiftC * 100) / 100,
      altitudeCorrectionC: corrected.corrections.altitudeCorrectionC,
      nightInversionC: corrected.corrections.nightInversionC,
      frostRisk,
      irrigationNeedMm,
    });
  }

  return estimations;
}
