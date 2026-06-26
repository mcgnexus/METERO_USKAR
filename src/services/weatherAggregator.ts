import { fetchObservationLayer } from "@/services/layerObservation";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { computeAgriculturalData } from "@/services/agriculturalService";
import { computeLivestockData } from "@/services/livestockService";
import { refreshRuntimeParameters } from "@/services/modelParameterService";
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
  LightningData,
} from "@/types/weather";

const OBSERVATION_TIMEOUT_MS = 15000;

function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
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
  await refreshRuntimeParameters();
  await getCalibratedTolerances();

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
  } catch (error) {
    layer1Error = error instanceof Error ? error.message : "unknown error";
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
      time: [],
      temperatureC: [],
      humidityPct: [],
      precipitationProbabilityPct: [],
      precipitationMm: [],
      weatherCode: [],
      windSpeedKmh: [],
    };
    const emptyDaily: DailyWeather = {
      time: [],
      temperatureMaxC: [],
      temperatureMinC: [],
      precipitationProbabilityPct: [],
      precipitationSumMm: [],
      windGustKmh: [],
      et0Mm: [],
      weatherCode: [],
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
    layerResult.daily
  );
  const livestock = computeLivestockData(tempC, humPct);
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

  const sourceLevel: "FUSED" | "OPEN_METEO" | "AEMET" | "LOCAL_STATIONS" | "ERROR" =
    layerResult.sources.length >= 2
      ? "FUSED"
      : layerResult.sources.length === 1
        ? layerResult.sources[0].source
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
