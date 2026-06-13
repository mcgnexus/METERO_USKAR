import { fetchObservationLayer } from "@/services/layerObservation";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { computeAgriculturalData } from "@/services/agriculturalService";
import { HUESCAR_COORDS } from "@/lib/geo";
import type {
  CurrentWeather,
  SourceObservation,
  SourceHealth,
  HourlyWeather,
  ComparisonHourlyWeather,
  DailyWeather,
  WeatherPayload,
  WeatherAlert,
  AgriculturalData,
  LivestockData,
  LightningData,
} from "@/types/weather";

const OBSERVATION_TIMEOUT_MS = 15000;

function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function computeGDD(tMean: number): number {
  return Math.max(0, tMean - 10);
}

function computeFrostRisk(tempC: number): "none" | "media" | "alta" | "muy_alta" {
  if (tempC < -4) return "muy_alta";
  if (tempC < -1) return "alta";
  if (tempC < 2) return "media";
  return "none";
}

function computeWorkability(
  tMin: number,
  precipMm: number,
  gustsKmh: number
): { workable: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (tMin < -5) reasons.push("temperature_below_-5C");
  if (precipMm > 15) reasons.push("precipitation_above_15mm");
  if (gustsKmh > 70) reasons.push("gusts_above_70kmh");
  return { workable: reasons.length === 0, reasons };
}

function computeTHI(tempC: number, rhPct: number): number {
  const e = (rhPct / 100) * 0.611 * Math.exp((17.5 * tempC) / (241 + tempC));
  return tempC + 0.36 * e + 41.2;
}

function thiLevel(thi: number): "ninguno" | "leve" | "moderado" | "severo" | "peligroso" {
  if (thi < 70) return "ninguno";
  if (thi < 75) return "leve";
  if (thi < 80) return "moderado";
  if (thi < 85) return "severo";
  return "peligroso";
}

function generateAlerts(
  tempC: number,
  gustsKmh: number,
  humidityPct: number,
  et0Mm: number
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (tempC <= 0) {
    alerts.push({ type: "frost", level: "peligro", title: "Helada", message: "Temperatura bajo 0°C. Proteger cultivos sensibles." });
  } else if (tempC <= 2) {
    alerts.push({ type: "frost", level: "aviso", title: "Helada débil", message: "Riesgo de helada. Vigilar cultivos." });
  }

  if (tempC >= 36) {
    alerts.push({ type: "heat", level: "peligro", title: "Calor extremo", message: "Temperatura superior a 36°C. Riesgo para personas y ganado." });
  } else if (tempC >= 32) {
    alerts.push({ type: "heat", level: "aviso", title: "Calor intenso", message: "Temperatura superior a 32°C. Tomar precauciones." });
  }

  if (gustsKmh >= 60) {
    alerts.push({ type: "wind", level: "peligro", title: "Vientos fuertes", message: "Rachas superiores a 60 km/h. Riesgo de daños." });
  } else if (gustsKmh >= 40) {
    alerts.push({ type: "wind", level: "aviso", title: "Vientos moderados", message: "Rachas superiores a 40 km/h. Precaución." });
  }

  if (humidityPct <= 20) {
    alerts.push({ type: "dryness", level: "peligro", title: "Sequedad extrema", message: "Humedad bajo 20%. Riesgo de incendios." });
  } else if (humidityPct <= 30 && et0Mm >= 0.15) {
    alerts.push({ type: "dryness", level: "aviso", title: "Sequedad ambiental", message: "Humedad baja y evapotranspiración elevada." });
  }

  return alerts;
}

export async function aggregateWeather(): Promise<WeatherPayload> {
  const tolerances = await getCalibratedTolerances();

  const observationPromise = fetchWithTimeout(
    fetchObservationLayer(),
    OBSERVATION_TIMEOUT_MS
  );

  let layerResult: {
    current: CurrentWeather;
    sources: SourceObservation[];
    sourceHealth: SourceHealth[];
    hourly: HourlyWeather;
    comparisonHourly: ComparisonHourlyWeather;
    daily: DailyWeather;
    confidencePct: number;
    confidenceExplanation: string;
    orographic?: {
      factor: number;
      classification: "barlovento" | "sotavento" | "neutro";
      description: string;
    };
  } | null = null;
  let layer1Error: string | null = null;

  try {
    layerResult = await observationPromise;
  } catch (e) {
    layer1Error = e instanceof Error ? e.message : "unknown error";
  }

  if (!layerResult) {
    const emptyCurrent: CurrentWeather = {
      time: new Date().toISOString(),
      temperatureC: 0,
      apparentTemperatureC: 0,
      humidityPct: 0,
      precipitationMm: 0,
      weatherCode: 0,
      windSpeedKmh: 0,
      windDirectionDeg: 0,
      windGustKmh: 0,
      solarRadiationWm2: 0,
      et0Mm: 0,
    };
    const emptyHourly: HourlyWeather = {
      time: [], temperatureC: [], humidityPct: [],
      precipitationProbabilityPct: [], precipitationMm: [],
      weatherCode: [], windSpeedKmh: [],
    };
    const emptyDaily: DailyWeather = {
      time: [], temperatureMaxC: [], temperatureMinC: [],
      precipitationProbabilityPct: [], precipitationSumMm: [],
      windGustKmh: [], et0Mm: [], weatherCode: [],
    };

    return {
      location: "Huéscar",
      latitude: HUESCAR_COORDS.lat,
      longitude: HUESCAR_COORDS.lon,
      elevation: HUESCAR_COORDS.elevation,
      timezone: "Europe/Madrid",
      source: "ERROR",
      fetchedAt: new Date().toISOString(),
      confidencePct: 0,
      confidenceExplanation: layer1Error ?? "Layer 1 (observation) failed",
      current: emptyCurrent,
      sources: [],
      sourceHealth: [],
      hourly: emptyHourly,
      comparisonHourly: { aemet: null, openMeteo: null },
      daily: emptyDaily,
      alerts: [],
    };
  }

  const tempC = layerResult.current.temperatureC;
  const humPct = layerResult.current.humidityPct;
  const gustsKmh = layerResult.current.windGustKmh;
  const et0 = layerResult.current.et0Mm;

  const agricultural = computeAgriculturalData(
    layerResult.hourly,
    layerResult.daily,
    tempC
  );

  const thi = computeTHI(tempC, humPct);
  const livestock: LivestockData = {
    thi: Math.round(thi * 10) / 10,
    level: thiLevel(thi),
    affectedLivestock: thi >= 75 ? "bovino,ovino,caprino" : "ninguno",
  };

  const alerts = generateAlerts(tempC, gustsKmh, humPct, et0);

  const lightning: LightningData = {
    active: false,
    level: "info",
    nearestStrikeKm: null,
    strikeCount: 0,
    strikes: [],
    lastCheckedAt: new Date().toISOString(),
    source: "unavailable",
    message: "Lightning data not available",
  };

  const sourceLevel: "FUSED" | "OPEN_METEO" | "AEMET" | "ERROR" =
    layerResult.sources.length >= 2
      ? "FUSED"
      : layerResult.sources.length === 1
        ? (layerResult.sources[0].source === "AEMET" ? "AEMET" : "OPEN_METEO")
        : "ERROR";

  return {
    location: "Huéscar",
    latitude: HUESCAR_COORDS.lat,
    longitude: HUESCAR_COORDS.lon,
    elevation: HUESCAR_COORDS.elevation,
    timezone: "Europe/Madrid",
    source: sourceLevel,
    fetchedAt: new Date().toISOString(),
    confidencePct: layerResult.confidencePct,
    confidenceExplanation: layerResult.confidenceExplanation,
    current: layerResult.current,
    sources: layerResult.sources,
    sourceHealth: layerResult.sourceHealth,
    hourly: layerResult.hourly,
    comparisonHourly: layerResult.comparisonHourly,
    daily: layerResult.daily,
    alerts,
    lightning,
    agricultural,
    livestock,
    orographic: layerResult.orographic,
  };
}
