import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import {
  barometricPressureHPa,
  conservedRelativeHumidity,
  dewPoint,
  relativeHumidity,
} from "@/lib/dewPoint";
import { fetchLocalStations } from "@/services/stationService";
import {
  dailyRadiationToAverageWm2,
  fetchAllRiaDailyData,
  RiaDailyData,
} from "@/services/riaClient";
import { fetchAEMETObservations } from "@/services/aemetClient";
import { getModelParam } from "@/services/modelParameterService";
import { fetchCurrentCloudCover } from "@/services/openMeteoForecastService";
import type { ZoneType } from "@/lib/geo";

const AEMET_API_KEY = process.env.AEMET_API_KEY || "";
const AEMET_TIMEOUT_MS = parseInt(process.env.AEMET_TIMEOUT_MS || "5000", 10);
const AEMET_CACHE_TTL_MS = 60 * 60 * 1000;
const AEMET_FAILURE_CACHE_TTL_MS = parseInt(process.env.AEMET_RATE_LIMIT_COOLDOWN_MS || "900000");
const GROUND_TRUTH_NODE_CODE = (process.env.GROUND_TRUTH_NODE_CODE || "").trim();

const REFERENCE_NODES = {
  baza: { id: "5047E", name: "AEMET Baza", lat: 37.5058, lon: -2.735, elevation: 785 },
  sanClemente: { id: "5051X", name: "AEMET San Clemente", lat: 37.861389, lon: -2.652778, elevation: 1101 },
};

const LLANO = { id: "llano_huescar", name: "Llano/Casco urbano Huéscar", lat: 37.8094, lon: -2.5392, elevation: 953 };

type SourceKind = "AEMET" | "OPEN_METEO" | "LOCAL_STATION";

export interface ClimateNodeReading {
  source: SourceKind;
  stationId: string;
  name: string;
  time: string;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHPa?: number | null;
  elevationM: number;
  status: "OK" | "FALLBACK" | "MISSING";
}

export interface ExtrapolationResult {
  sourceStation: "Baza 5047E";
  sourceElevationM: number;
  targetElevationM: number;
  deltaZ: number;
  rawTemperatureC: number;
  pressureHPa: number;
  pressureMethod: "barometric_from_baza_aemet" | "barometric_from_estimated_baza" | "standard_atmosphere";
  humidityPct: number | null;
  humidityMethod: "vapor_conservation_from_baza_aemet" | "vapor_conservation_from_estimated_baza" | "negratin_advection_corrected" | "unavailable";
  negratínPenaltyApplied: boolean;
  bazaWindDirectionDeg: number | null;
  bazaWindDirectionSource: "open_meteo" | "unavailable";
}

export interface RadiationWindReading {
  source: "OPEN_METEO" | "RIA_BLEND";
  time: string;
  solarRadiationWm2: number;
  windSpeed2mKmh: number;
  et0DailyMm?: number | null;
  stationName?: string;
  status: "OK" | "FALLBACK";
  radiationBlend?: {
    bazaWeight: number;
    pueblaWeight: number;
    foehnDetected: boolean;
    anticyclone: boolean;
    cloudCoverPct: number | null;
    bazaPressureHPa: number | null;
    bazaRadiationMJm2: number | null;
    pueblaRadiationMJm2: number | null;
  };
  windSource?: "baza_ria" | "puebla_ria_reduced" | "blended_baza_priority" | "open_meteo";
  stations?: {
    baza: RiaDailyData | null;
    puebla: RiaDailyData | null;
  };
  cloudCoverPct?: number | null;
}

export interface ClimateCalibrationResult {
  location: typeof LLANO;
  generatedAt: string;
  nodes: {
    baza: ClimateNodeReading;
    sanClemente: ClimateNodeReading;
    localStation: ClimateNodeReading | null;
    radiationWind: RadiationWindReading;
  };
  interpolation: {
    inversionDetected: boolean;
    dynamicGradientCPerM: number;
    dynamicGradientCPer100m: number;
    estimatedTemperatureC: number;
    formula: string;
  };
  dewPoint: {
    dewPointC: number | null;
    frostRisk: "none" | "media" | "alta" | "muy_alta" | "unknown";
    blackFrostRisk: boolean;
  };
  eto: {
    etoHourlyMm: number | null;
    method: "FAO56_HOURLY_PM";
    inputs: {
      temperatureC: number | null;
      humidityPct: number | null;
      pressureKPa: number | null;
      solarRadiationWm2: number;
      netRadiationMJm2h: number;
      windSpeed2mMs: number;
    };
  };
  calibration: {
    realTemperatureC: number | null;
    residualC: number | null;
    residualDefinition: "estimated_minus_real";
    canTrainModel: boolean;
  };
  microclimate: {
    hourMadrid: number;
    isNighttime: boolean;
    inversionConditions: boolean;
    windSpeed2mMs: number;
    coldAirDrainageC: number;
    urbanHeatIslandC: number;
    totalCorrectionC: number;
    rawInterpolatedTempC: number;
    reservoirHumidityReductionPct: number;
    rainfallFoehnFactor: number;
    windGustReductionFactor: number;
  };
  extrapolation: ExtrapolationResult;
  exoticVariables: {
    cloudCoverPct: number | null;
    dewPoint2mC: number | null;
    vapourPressureDeficitKPa: number | null;
    directRadiationWm2: number | null;
    diffuseRadiationWm2: number | null;
    visibilityM: number | null;
    uvIndex: number | null;
    capeJkg: number | null;
    isDay: boolean | null;
    soilTemp10cmC: number | null;
    soilTemp40cmC: number | null;
    soilMoisture0To1cm: number | null;
    soilMoisture1To3cm: number | null;
    soilMoisture3To9cm: number | null;
    soilMoisture9To27cm: number | null;
    soilMoisture27To81cm: number | null;
    source: "open_meteo" | "unavailable";
  };
  quality: {
    confidencePct: number;
    warnings: string[];
    breakdown?: {
      basePct: number;
      missingPenalty: number;
      localStationPenalty: number;
      agePenalty: number;
      maxSourceAgeMin: number;
      structuralWarnings: string[];
    };
  };
}

function parseNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAemetStation(station: typeof REFERENCE_NODES.sanClemente): Promise<ClimateNodeReading> {
  const cacheKey = `climate:aemet:${station.id}`;
  const cached = cacheGet<ClimateNodeReading>(cacheKey);
  if (cached) return cached;

  if (station.id === "5051X") {
    const shared = await fetchAEMETObservations().catch(() => ({ observations: [] }));
    const obs = shared.observations[0];
    if (obs) {
      const reading: ClimateNodeReading = {
        source: "AEMET",
        stationId: station.id,
        name: station.name,
        time: obs.time,
        temperatureC: obs.rawTemperatureC ?? obs.temperatureC,
        humidityPct: obs.humidityPct,
        elevationM: obs.elevationM ?? station.elevation,
        status: "OK",
      };
      cacheSet(cacheKey, reading, AEMET_CACHE_TTL_MS);
      return reading;
    }
    const missing: ClimateNodeReading = { source: "AEMET", stationId: station.id, name: station.name, time: new Date().toISOString(), temperatureC: null, humidityPct: null, elevationM: station.elevation, status: "MISSING" };
    cacheSet(cacheKey, missing, AEMET_FAILURE_CACHE_TTL_MS);
    return missing;
  }

  if (!AEMET_API_KEY) {
    return { source: "AEMET", stationId: station.id, name: station.name, time: new Date().toISOString(), temperatureC: null, humidityPct: null, elevationM: station.elevation, status: "MISSING" };
  }

  try {
    const metaUrl = `https://opendata.aemet.es/opendata/api/observacion/convencional/datos/estacion/${station.id}?api_key=${AEMET_API_KEY}`;
    const metaRes = await fetchWithTimeout(metaUrl, AEMET_TIMEOUT_MS);
    const metaText = await metaRes.text();
    if (!metaRes.ok) throw new Error(`AEMET ${station.id} meta HTTP ${metaRes.status}: ${metaText.slice(0, 160)}`);
    if (!metaText.trim()) throw new Error(`AEMET ${station.id} meta HTTP 200 con cuerpo vacio`);
    const meta = JSON.parse(metaText);
    if (!meta?.datos) throw new Error(`AEMET ${station.id} sin datos URL`);

    const dataRes = await fetchWithTimeout(meta.datos, AEMET_TIMEOUT_MS);
    const dataText = await dataRes.text();
    if (!dataRes.ok) throw new Error(`AEMET ${station.id} datos HTTP ${dataRes.status}: ${dataText.slice(0, 160)}`);
    if (!dataText.trim()) throw new Error(`AEMET ${station.id} datos HTTP 200 con cuerpo vacio`);
    const rows = JSON.parse(dataText);
    const latest = Array.isArray(rows) ? rows.at(-1) : null;
    if (!latest) throw new Error(`AEMET ${station.id} sin observaciones`);

    const reading: ClimateNodeReading = {
      source: "AEMET",
      stationId: station.id,
      name: station.name,
      time: String(latest.fint || new Date().toISOString()),
      temperatureC: parseNumber(latest.ta),
      humidityPct: parseNumber(latest.hr),
      pressureHPa: parseNumber(latest.pres),
      elevationM: parseNumber(latest.alt) ?? station.elevation,
      status: "OK",
    };
    cacheSet(cacheKey, reading, AEMET_CACHE_TTL_MS);
    return reading;
  } catch (error) {
    console.warn(`[ClimateCalibration] ${station.id} fallback:`, error instanceof Error ? error.message : error);
    const missing: ClimateNodeReading = { source: "AEMET", stationId: station.id, name: station.name, time: new Date().toISOString(), temperatureC: null, humidityPct: null, elevationM: station.elevation, status: "MISSING" };
    cacheSet(cacheKey, missing, AEMET_FAILURE_CACHE_TTL_MS);
    return missing;
  }
}

async function fetchOpenMeteoCurrent(lat: number, lon: number, elevation: number): Promise<{ time: string; temperatureC: number; humidityPct: number; pressureHPa: number; solarRadiationWm2: number; windSpeed10mKmh: number; }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&elevation=${elevation}&current=temperature_2m,relative_humidity_2m,surface_pressure,shortwave_radiation,wind_speed_10m&timezone=auto&forecast_days=1`;
  const res = await fetchWithTimeout(url, 8000);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();
  const current = json.current ?? {};
  return {
    time: String(current.time || new Date().toISOString()),
    temperatureC: parseNumber(current.temperature_2m) ?? 0,
    humidityPct: parseNumber(current.relative_humidity_2m) ?? 50,
    pressureHPa: parseNumber(current.surface_pressure) ?? pressureFromElevation(elevation) * 10,
    solarRadiationWm2: parseNumber(current.shortwave_radiation) ?? 0,
    windSpeed10mKmh: parseNumber(current.wind_speed_10m) ?? 0,
  };
}

async function fetchBazaWindDirection(): Promise<number | null> {
  const cacheKey = "climate:baza:wind_direction";
  const cached = cacheGet<number>(cacheKey);
  if (cached !== null && cached !== undefined) return cached;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${REFERENCE_NODES.baza.lat}&longitude=${REFERENCE_NODES.baza.lon}&current=wind_direction_10m&timezone=auto&forecast_days=1`;
  try {
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) return null;
    const json = await res.json();
    const dir = parseNumber(json.current?.wind_direction_10m);
    if (dir !== null) {
      cacheSet(cacheKey, dir, 60 * 60 * 1000);
    }
    return dir;
  } catch {
    return null;
  }
}

interface ExoticVariables {
  cloudCoverPct: number | null;
  dewPoint2mC: number | null;
  vapourPressureDeficitKPa: number | null;
  directRadiationWm2: number | null;
  diffuseRadiationWm2: number | null;
  visibilityM: number | null;
  uvIndex: number | null;
  capeJkg: number | null;
  isDay: boolean | null;
  soilTemp10cmC: number | null;
  soilTemp40cmC: number | null;
  soilMoisture0To1cm: number | null;
  soilMoisture1To3cm: number | null;
  soilMoisture3To9cm: number | null;
  soilMoisture9To27cm: number | null;
  soilMoisture27To81cm: number | null;
}

function emptyExoticVariables(): ExoticVariables {
  return {
    cloudCoverPct: null,
    dewPoint2mC: null,
    vapourPressureDeficitKPa: null,
    directRadiationWm2: null,
    diffuseRadiationWm2: null,
    visibilityM: null,
    uvIndex: null,
    capeJkg: null,
    isDay: null,
    soilTemp10cmC: null,
    soilTemp40cmC: null,
    soilMoisture0To1cm: null,
    soilMoisture1To3cm: null,
    soilMoisture3To9cm: null,
    soilMoisture9To27cm: null,
    soilMoisture27To81cm: null,
  };
}

async function fetchExoticVariables(): Promise<ExoticVariables> {
  const cacheKey = "climate:llano:exotic";
  const cached = cacheGet<ExoticVariables>(cacheKey);
  if (cached) return cached;
  const currentVars = [
    "cloud_cover",
    "dew_point_2m",
    "vapour_pressure_deficit",
    "direct_radiation",
    "diffuse_radiation",
    "visibility",
    "uv_index",
    "cape",
    "is_day",
    "soil_temperature_0_to_7cm",
    "soil_temperature_28_to_100cm",
    "soil_moisture_0_to_1cm",
    "soil_moisture_1_to_3cm",
    "soil_moisture_3_to_9cm",
    "soil_moisture_9_to_27cm",
    "soil_moisture_27_to_81cm",
  ].join(",");
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LLANO.lat}&longitude=${LLANO.lon}&elevation=${LLANO.elevation}&current=${currentVars}&timezone=Europe/Madrid&forecast_days=1`;
  try {
    const res = await fetchWithTimeout(url, 5000);
    if (!res.ok) return emptyExoticVariables();
    const json = await res.json();
    const isDay = parseNumber(json.current?.is_day);
    const result: ExoticVariables = {
      cloudCoverPct: parseNumber(json.current?.cloud_cover),
      dewPoint2mC: parseNumber(json.current?.dew_point_2m),
      vapourPressureDeficitKPa: parseNumber(json.current?.vapour_pressure_deficit),
      directRadiationWm2: parseNumber(json.current?.direct_radiation),
      diffuseRadiationWm2: parseNumber(json.current?.diffuse_radiation),
      visibilityM: parseNumber(json.current?.visibility),
      uvIndex: parseNumber(json.current?.uv_index),
      capeJkg: parseNumber(json.current?.cape),
      isDay: isDay === null ? null : isDay === 1,
      soilTemp10cmC: parseNumber(json.current?.soil_temperature_0_to_7cm),
      soilTemp40cmC: parseNumber(json.current?.soil_temperature_28_to_100cm),
      soilMoisture0To1cm: parseNumber(json.current?.soil_moisture_0_to_1cm),
      soilMoisture1To3cm: parseNumber(json.current?.soil_moisture_1_to_3cm),
      soilMoisture3To9cm: parseNumber(json.current?.soil_moisture_3_to_9cm),
      soilMoisture9To27cm: parseNumber(json.current?.soil_moisture_9_to_27cm),
      soilMoisture27To81cm: parseNumber(json.current?.soil_moisture_27_to_81cm),
    };
    cacheSet(cacheKey, result, 30 * 60 * 1000);
    return result;
  } catch {
    return emptyExoticVariables();
  }
}

function getHourMadrid(): number {
  return parseInt(
    new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).format(new Date()),
    10
  );
}

function estimateBazaFromHuescar(sanClemente: ClimateNodeReading): ClimateNodeReading {
  const rawTemp = sanClemente.temperatureC ?? 0;
  const rawHum = sanClemente.humidityPct ?? 50;
  const isRealAemet = sanClemente.source === "AEMET" && sanClemente.status === "OK";

  const hourMadrid = getHourMadrid();
  const isDaytime = hourMadrid >= 8 && hourMadrid < 20;

  let tempBase = rawTemp;
  let humBase = rawHum;

  if (isRealAemet) {
    const tempBias = isDaytime
      ? getModelParam("reservoir_temp_bias_day")
      : getModelParam("reservoir_temp_bias_night");
    tempBase = rawTemp - tempBias;

    const tdStation = dewPoint(rawTemp, rawHum);
    const tdCorrected = tdStation - getModelParam("reservoir_dew_bias");
    humBase = relativeHumidity(tempBase, tdCorrected);
  }

  const lapseRate = getModelParam("altitude_lapse_rate");
  const deltaH = REFERENCE_NODES.sanClemente.elevation - REFERENCE_NODES.baza.elevation;
  const estimatedTemp = tempBase + lapseRate * deltaH;

  const tdBase = dewPoint(tempBase, humBase);
  const tdEstimated = tdBase + 0.0018 * deltaH;
  const humEstimated = relativeHumidity(estimatedTemp, tdEstimated);

  return {
    source: "AEMET",
    stationId: REFERENCE_NODES.baza.id,
    name: `${REFERENCE_NODES.baza.name} (estimado desde Huéscar)`,
    time: sanClemente.time,
    temperatureC: Math.round(estimatedTemp * 10) / 10,
    humidityPct: Math.round(humEstimated),
    elevationM: REFERENCE_NODES.baza.elevation,
    status: "FALLBACK",
  };
}

interface LlanoMicroclimate {
  correctedTempC: number;
  coldAirDrainageC: number;
  urbanHeatIslandC: number;
  totalCorrectionC: number;
  inversionConditions: boolean;
  hourMadrid: number;
  isNighttime: boolean;
}

function getZoneDrainageFactor(zoneType: ZoneType): number {
  switch (zoneType) {
    case "URBAN":
      return getModelParam("cold_air_drainage_factor_urban_center");
    case "VEGA":
      return getModelParam("cold_air_drainage_factor_vega");
    case "MONTE":
      return getModelParam("cold_air_drainage_factor_monte");
    case "RESERVOIR":
      return getModelParam("cold_air_drainage_factor_reservoir");
    case "SECANO":
      return getModelParam("cold_air_drainage_factor_urban_barrio");
    default:
      return 0.5;
  }
}

function computeLlanoMicroclimate(
  rawEstimatedTempC: number,
  windSpeed2mMs: number,
  cloudCoverPct?: number | null,
  zoneType: ZoneType = "URBAN",
): LlanoMicroclimate {
  const hourMadrid = getHourMadrid();
  const isNighttime = hourMadrid < 8 || hourMadrid >= 20;
  const windThreshold = getModelParam("inversion_wind_threshold_ms");

  let coldAirDrainageC = 0;
  let urbanHeatIslandC = 0;

  if (isNighttime) {
    const amplitude = Math.abs(getModelParam("cold_air_drainage_max_c"));
    const zoneFactor = getZoneDrainageFactor(zoneType);
    const F_viento = Math.max(0, 1 - windSpeed2mMs / windThreshold);
    const F_cielo = cloudCoverPct != null ? Math.max(0, 1 - cloudCoverPct / 100) : 0.7;
    coldAirDrainageC = Math.round(-amplitude * zoneFactor * F_viento * F_cielo * 10) / 10;
    urbanHeatIslandC = getModelParam("urban_heat_island_night_c");
  } else {
    urbanHeatIslandC = getModelParam("urban_heat_island_day_c");
  }

  const totalCorrectionC = Math.round((coldAirDrainageC + urbanHeatIslandC) * 10) / 10;
  const correctedTempC = Math.round((rawEstimatedTempC + totalCorrectionC) * 10) / 10;

  return {
    correctedTempC,
    coldAirDrainageC,
    urbanHeatIslandC,
    totalCorrectionC,
    inversionConditions: isNighttime && coldAirDrainageC < 0,
    hourMadrid,
    isNighttime,
  };
}

async function withOpenMeteoFallback(reading: ClimateNodeReading, station: typeof REFERENCE_NODES.sanClemente): Promise<ClimateNodeReading> {
  if (reading.temperatureC !== null && reading.humidityPct !== null) return reading;
  const fallback = await fetchOpenMeteoCurrent(station.lat, station.lon, station.elevation);
  return {
    source: "OPEN_METEO",
    stationId: station.id,
    name: `${station.name} (fallback Open-Meteo)`,
    time: fallback.time,
    temperatureC: fallback.temperatureC,
    humidityPct: fallback.humidityPct,
    pressureHPa: fallback.pressureHPa,
    elevationM: station.elevation,
    status: "FALLBACK",
  };
}

const RIA_PUEBLA_DISTANCE_KM = 20;
const RIA_BAZA_DISTANCE_KM = 42;
const PUEBLA_WIND_REDUCTION_FACTOR = 0.4;
const ANTICYCLONE_BAZA_STATION_PRESSURE_HPA = 925;
const STORM_BAZA_WEIGHT = 0.70;
const STORM_PUEBLA_WEIGHT = 0.30;
const FOEHN_RATIO_THRESHOLD = 0.8;
const CLOUDY_THRESHOLD_PCT = 60;

interface RadiationWeights {
  bazaWeight: number;
  pueblaWeight: number;
  foehnDetected: boolean;
  anticyclone: boolean;
  blendedValue: number | null;
}

function detectFoehn(bazaR: number | null, pueblaR: number | null, cloudCoverPct: number | null): boolean {
  if (cloudCoverPct !== null && cloudCoverPct >= CLOUDY_THRESHOLD_PCT) return true;
  if (bazaR === null || pueblaR === null) return false;
  if (bazaR <= 0) return false;
  return pueblaR < bazaR * FOEHN_RATIO_THRESHOLD;
}

function isAnticyclonic(bazaStationPressureHPa: number | null, cloudCoverPct: number | null): boolean {
  if (cloudCoverPct !== null && cloudCoverPct < CLOUDY_THRESHOLD_PCT) return true;
  if (bazaStationPressureHPa === null) return false;
  return bazaStationPressureHPa >= ANTICYCLONE_BAZA_STATION_PRESSURE_HPA;
}

function computeRadiationWeights(
  bazaRs: number | null,
  pueblaRs: number | null,
  bazaPressureHPa: number | null,
  cloudCoverPct: number | null
): RadiationWeights {
  const foehnDetected = detectFoehn(bazaRs, pueblaRs, cloudCoverPct);
  const anticyclone = isAnticyclonic(bazaPressureHPa, cloudCoverPct);

  if (bazaRs === null && pueblaRs === null) {
    return { bazaWeight: 0, pueblaWeight: 0, foehnDetected, anticyclone, blendedValue: null };
  }
  if (bazaRs === null) {
    return { bazaWeight: 0, pueblaWeight: 1, foehnDetected, anticyclone, blendedValue: pueblaRs };
  }
  if (pueblaRs === null) {
    return { bazaWeight: 1, pueblaWeight: 0, foehnDetected, anticyclone, blendedValue: bazaRs };
  }

  let wBaza: number;
  let wPuebla: number;

  if (anticyclone && !foehnDetected) {
    const dPuebla = RIA_PUEBLA_DISTANCE_KM;
    const dBaza = RIA_BAZA_DISTANCE_KM;
    wPuebla = (1 / (dPuebla * dPuebla)) /
      ((1 / (dPuebla * dPuebla)) + (1 / (dBaza * dBaza)));
    wBaza = 1 - wPuebla;
  } else {
    wBaza = STORM_BAZA_WEIGHT;
    wPuebla = STORM_PUEBLA_WEIGHT;
  }

  return {
    bazaWeight: wBaza,
    pueblaWeight: wPuebla,
    foehnDetected,
    anticyclone,
    blendedValue: wBaza * bazaRs + wPuebla * pueblaRs,
  };
}

async function fetchRadiationWind(): Promise<RadiationWindReading> {
  const bazaAemet = await fetchAemetStation(REFERENCE_NODES.baza).catch(() => null);
  const bazaPressureHPa = bazaAemet?.pressureHPa ?? null;
  const { baza: riaBaza, puebla: riaPuebla } = await fetchAllRiaDailyData().catch(() => ({ baza: null, puebla: null }));
  const cloudCoverPct = await fetchCurrentCloudCover(LLANO.lat, LLANO.lon).catch(() => null);
  const bazaRs = riaBaza?.radiationMJm2Day ?? null;
  const pueblaRs = riaPuebla?.radiationMJm2Day ?? null;
  const bazaWind = riaBaza?.windSpeed2mMs ?? null;
  const pueblaWind = riaPuebla?.windSpeed2mMs ?? null;

  if (bazaRs !== null || pueblaRs !== null || bazaWind !== null || pueblaWind !== null) {
    const weights = computeRadiationWeights(bazaRs, pueblaRs, bazaPressureHPa, cloudCoverPct);
    const solarRadiationWm2 = weights.blendedValue !== null
      ? dailyRadiationToAverageWm2(weights.blendedValue)
      : 0;

    let windSpeed2mKmh: number;
    let windSource: RadiationWindReading["windSource"];
    if (bazaWind !== null) {
      windSpeed2mKmh = bazaWind * 3.6 * getModelParam("vega_friction_factor");
      windSource = "baza_ria";
    } else if (pueblaWind !== null) {
      windSpeed2mKmh = pueblaWind * 3.6 * PUEBLA_WIND_REDUCTION_FACTOR * getModelParam("vega_friction_factor");
      windSource = "puebla_ria_reduced";
    } else {
      windSpeed2mKmh = 0;
      windSource = "blended_baza_priority";
    }

    const refEt0 = riaBaza?.et0MmDay ?? riaPuebla?.et0MmDay ?? null;
    const refStation = weights.foehnDetected
      ? cloudCoverPct !== null && cloudCoverPct >= CLOUDY_THRESHOLD_PCT
        ? "Baza RIA (Foehn por nubosidad Open-Meteo)"
        : "Baza RIA (Foehn por diferencial RIA)"
      : weights.anticyclone
        ? "RIA blend (anticiclón, IDW puro)"
        : bazaRs !== null && pueblaRs !== null
          ? "RIA blend (borrasca/NW, Baza 70%)"
          : riaBaza?.stationName ?? riaPuebla?.stationName ?? "RIA";

    return {
      source: "RIA_BLEND",
      time: riaBaza?.date ?? riaPuebla?.date ?? new Date().toISOString().slice(0, 10),
      solarRadiationWm2,
      windSpeed2mKmh: Math.round(windSpeed2mKmh * 100) / 100,
      et0DailyMm: refEt0,
      stationName: refStation,
      status: "OK",
      radiationBlend: {
        bazaWeight: Math.round(weights.bazaWeight * 1000) / 1000,
        pueblaWeight: Math.round(weights.pueblaWeight * 1000) / 1000,
        foehnDetected: weights.foehnDetected,
        anticyclone: weights.anticyclone,
        cloudCoverPct,
        bazaPressureHPa,
        bazaRadiationMJm2: bazaRs,
        pueblaRadiationMJm2: pueblaRs,
      },
      windSource,
      stations: { baza: riaBaza, puebla: riaPuebla },
      cloudCoverPct,
    };
  }

  const fallback = await fetchOpenMeteoCurrent(LLANO.lat, LLANO.lon, LLANO.elevation);
  return {
    source: "OPEN_METEO",
    time: fallback.time,
    solarRadiationWm2: fallback.solarRadiationWm2,
    windSpeed2mKmh: wind10mTo2m(fallback.windSpeed10mKmh) * getModelParam("vega_friction_factor"),
    stationName: "Open-Meteo (sin datos RIA)",
    status: "FALLBACK",
    windSource: "open_meteo",
    cloudCoverPct,
  };
}

interface GroundTruthResult {
  reading: ClimateNodeReading;
  ageMin: number;
}

async function fetchGroundTruth(): Promise<GroundTruthResult | null> {
  const rawStations = await fetchLocalStations().catch(() => []);
  const stations = [...rawStations].sort((a, b) => {
    if (!GROUND_TRUTH_NODE_CODE) return 0;
    const aCode = String(a.node_code ?? a.id ?? "");
    const bCode = String(b.node_code ?? b.id ?? "");
    return Number(bCode === GROUND_TRUTH_NODE_CODE) - Number(aCode === GROUND_TRUTH_NODE_CODE);
  });
  const now = Date.now();
  for (const station of stations) {
    const stationId = String(station.node_code ?? station.id ?? "local");
    if (GROUND_TRUTH_NODE_CODE && stationId !== GROUND_TRUTH_NODE_CODE) continue;
    const time = station.updated_at ?? station.measured_at ?? station.timestamp ?? station.raw?.measured_at;
    const ageMin = time ? (now - new Date(time).getTime()) / 60000 : 9999;
    const temperature = parseNumber(station.temperature, station.temperatura, station.temp, station.air_temp_c, station.raw?.air_temp_c);
    const humidity = parseNumber(station.humidity, station.humedad, station.hr, station.air_humidity_pct, station.raw?.air_humidity_pct);
    if (ageMin > 360 || temperature === null || humidity === null) continue;
    return {
      reading: {
        source: "LOCAL_STATION",
        stationId,
        name: String(station.name ?? station.location_name ?? "Estación propia"),
        time: new Date(time ?? Date.now()).toISOString(),
        temperatureC: temperature,
        humidityPct: humidity,
        pressureHPa: parseNumber(station.pressure_hpa, station.presion, station.pressure, station.raw?.pressure_hpa),
        elevationM: parseNumber(station.elevation, station.altitude, station.raw?.elevation) ?? LLANO.elevation,
        status: "OK",
      },
      ageMin,
    };
  }
  return null;
}

export function computeDynamicGradient(bazaTempC: number, sanClementeTempC: number): { gammaCPerM: number; inversionDetected: boolean } {
  const deltaH = REFERENCE_NODES.sanClemente.elevation - REFERENCE_NODES.baza.elevation;
  const rawGamma = (bazaTempC - sanClementeTempC) / deltaH;
  return {
    gammaCPerM: Math.max(-0.015, Math.min(0.012, Number.isFinite(rawGamma) ? rawGamma : 0.0065)),
    inversionDetected: bazaTempC < sanClementeTempC,
  };
}

export function estimateLlanoTemperature(bazaTempC: number, gammaCPerM: number): number {
  return bazaTempC - gammaCPerM * (LLANO.elevation - REFERENCE_NODES.baza.elevation);
}

export function computeFrostRisk(tempC: number | null, dewPointC: number | null): ClimateCalibrationResult["dewPoint"]["frostRisk"] {
  if (tempC === null || dewPointC === null) return "unknown";
  if (tempC <= 0) return "muy_alta";
  if (tempC <= 1) return "alta";
  if (tempC <= 3) return "media";
  return "none";
}

function pressureFromElevation(elevationM: number): number {
  return 101.3 * Math.pow((293 - 0.0065 * elevationM) / 293, 5.26);
}

function wind10mTo2m(wind10mKmh: number): number {
  return wind10mKmh * 0.748;
}

export function computeHourlyEto(input: { temperatureC: number; humidityPct: number; pressureHPa: number; solarRadiationWm2: number; windSpeed2mKmh: number; }): { etoHourlyMm: number; netRadiationMJm2h: number; windSpeed2mMs: number; pressureKPa: number } {
  const t = input.temperatureC;
  const rh = Math.min(100, Math.max(1, input.humidityPct));
  const pressureKPa = input.pressureHPa / 10;
  const rsMJm2h = Math.max(0, input.solarRadiationWm2) * 0.0036;
  const rn = 0.77 * rsMJm2h;
  const u2 = Math.max(0.1, input.windSpeed2mKmh / 3.6);
  const es = 0.6108 * Math.exp((17.27 * t) / (t + 237.3));
  const ea = es * (rh / 100);
  const delta = (4098 * es) / Math.pow(t + 237.3, 2);
  const gammaPsy = 0.000665 * pressureKPa;
  const eto = (0.408 * delta * rn + gammaPsy * (37 / (t + 273)) * u2 * (es - ea)) / (delta + gammaPsy * (1 + 0.34 * u2));
  return {
    etoHourlyMm: Math.round(Math.max(0, eto) * 1000) / 1000,
    netRadiationMJm2h: Math.round(rn * 1000) / 1000,
    windSpeed2mMs: Math.round(u2 * 100) / 100,
    pressureKPa: Math.round(pressureKPa * 100) / 100,
  };
}

function buildExtrapolation(
  baza: ClimateNodeReading,
  rawInterpolatedTempC: number,
  pressureHPa: number,
  bazaWindDirectionDeg: number | null
): ExtrapolationResult {
  const bazaIsRealAemet = baza.source === "AEMET" && baza.status === "OK";
  const bazaIsEstimated = baza.source === "AEMET" && baza.status === "FALLBACK";

  let pressureMethod: ExtrapolationResult["pressureMethod"];
  if (bazaIsRealAemet && baza.pressureHPa != null) {
    pressureMethod = "barometric_from_baza_aemet";
  } else if (bazaIsEstimated) {
    pressureMethod = "barometric_from_estimated_baza";
  } else {
    pressureMethod = "standard_atmosphere";
  }

  let humidityPct: number | null = null;
  let humidityMethod: ExtrapolationResult["humidityMethod"] = "unavailable";
  let negratínPenaltyApplied = false;

  if (baza.humidityPct != null && baza.temperatureC != null) {
    let effectiveRhPct = baza.humidityPct;

    if (bazaWindDirectionDeg !== null) {
      const westMin = getModelParam("negratin_west_min_deg");
      const westMax = getModelParam("negratin_west_max_deg");
      const humThreshold = getModelParam("negratin_humidity_threshold");
      const isFromWest = bazaWindDirectionDeg >= westMin && bazaWindDirectionDeg <= westMax;
      const isHumid = effectiveRhPct > humThreshold;

      if (isFromWest && isHumid) {
        effectiveRhPct = effectiveRhPct * getModelParam("negratin_penalty_factor");
        negratínPenaltyApplied = true;
      }
    }

    humidityPct = Math.round(
      conservedRelativeHumidity(baza.temperatureC, effectiveRhPct, rawInterpolatedTempC) * 10
    ) / 10;
    humidityMethod = negratínPenaltyApplied
      ? "negratin_advection_corrected"
      : bazaIsRealAemet
        ? "vapor_conservation_from_baza_aemet"
        : "vapor_conservation_from_estimated_baza";
  }

  return {
    sourceStation: "Baza 5047E",
    sourceElevationM: REFERENCE_NODES.baza.elevation,
    targetElevationM: LLANO.elevation,
    deltaZ: LLANO.elevation - REFERENCE_NODES.baza.elevation,
    rawTemperatureC: rawInterpolatedTempC,
    pressureHPa,
    pressureMethod,
    humidityPct,
    humidityMethod,
    negratínPenaltyApplied,
    bazaWindDirectionDeg,
    bazaWindDirectionSource: bazaWindDirectionDeg !== null ? "open_meteo" : "unavailable",
  };
}

function nodeAgeMin(node: ClimateNodeReading): number {
  if (!node.time) return 9999;
  const age = (Date.now() - new Date(node.time).getTime()) / 60000;
  return Number.isFinite(age) ? Math.max(0, age) : 9999;
}

function sensorWeightByAge(ageMin: number): number {
  const freshThreshold = getModelParam("sensor_fresh_threshold_min");
  const mediumThreshold = getModelParam("sensor_medium_threshold_min");
  const decayRange = getModelParam("sensor_medium_decay_min");

  if (ageMin <= freshThreshold) {
    return getModelParam("sensor_blend_weight_fresh");
  }
  if (ageMin <= mediumThreshold) {
    return getModelParam("sensor_blend_weight_medium");
  }
  if (ageMin <= mediumThreshold + decayRange) {
    const t = (ageMin - mediumThreshold) / decayRange;
    return getModelParam("sensor_blend_weight_medium") * (1 - t);
  }
  return 0;
}

function temporalSmoothedTemp(newTempC: number): number {
  const prev = cacheGet<number>("climate:llano:smoothed_temp");
  if (prev === null) return newTempC;
  const alpha = getModelParam("temporal_smoothing_alpha");
  return Math.round((alpha * newTempC + (1 - alpha) * prev) * 10) / 10;
}

async function getDynamicResidualBias(): Promise<number> {
  try {
    const cached = cacheGet<number>("climate:dynamic_residual_bias");
    if (cached !== null) return cached;
    return 0;
  } catch {
    return 0;
  }
}

export async function computeClimateCalibration(): Promise<ClimateCalibrationResult> {
  const warnings: string[] = [];
  const [bazaRaw, sanClementeRaw, groundTruth, radiationWind, bazaWindDirectionDeg, exoticVars] = await Promise.all([
    fetchAemetStation(REFERENCE_NODES.baza),
    fetchAemetStation(REFERENCE_NODES.sanClemente),
    fetchGroundTruth(),
    fetchRadiationWind(),
    fetchBazaWindDirection(),
    fetchExoticVariables(),
  ]);

  const localStation = groundTruth?.reading ?? null;
  const localStationAgeMin = groundTruth?.ageMin ?? null;

  const sanClemente = await withOpenMeteoFallback(sanClementeRaw, REFERENCE_NODES.sanClemente);

  let baza: ClimateNodeReading;
  if (bazaRaw.status === "OK") {
    baza = bazaRaw;
  } else if (sanClementeRaw.status === "OK") {
    baza = estimateBazaFromHuescar(sanClementeRaw);
    warnings.push("Baza 5047E sin dato: estimado desde Huéscar 5051X con correccion de embalse y gradiente altitudinal");
  } else if (sanClemente.temperatureC !== null) {
    baza = estimateBazaFromHuescar(sanClemente);
    warnings.push("Baza 5047E sin dato: estimado desde pronostico Huéscar con gradiente altitudinal");
  } else {
    const fb = await fetchOpenMeteoCurrent(REFERENCE_NODES.baza.lat, REFERENCE_NODES.baza.lon, REFERENCE_NODES.baza.elevation);
    baza = {
      source: "OPEN_METEO",
      stationId: REFERENCE_NODES.baza.id,
      name: `${REFERENCE_NODES.baza.name} (fallback Open-Meteo)`,
      time: fb.time,
      temperatureC: fb.temperatureC,
      humidityPct: fb.humidityPct,
      pressureHPa: fb.pressureHPa,
      elevationM: REFERENCE_NODES.baza.elevation,
      status: "FALLBACK",
    };
    warnings.push("Baza imputado con Open-Meteo (ni AEMET ni Huéscar disponibles)");
  }

  if (sanClemente.status !== "OK") warnings.push("San Clemente imputado con Open-Meteo");
  if (!localStation) warnings.push("Sin sensor propio del llano: se usa AEMET San Clemente como referencia oficial local, sin residual de entrenamiento");
  if (radiationWind.source !== "RIA_BLEND") warnings.push("Radiación y viento 2m imputados con Open-Meteo hasta configurar RIA");
  if (radiationWind.source === "RIA_BLEND") warnings.push("RIA blend Baza+Puebla: radiación interpolada IDW con corrección Foehn, viento de Baza por rugosidad");
  if (radiationWind.radiationBlend?.foehnDetected) warnings.push("Foehn detectado: sesgo radiativo hacia Baza por disipación orográfica en La Sagra");

  const bazaTemp = baza.temperatureC ?? 0;
  const sanTemp = sanClemente.temperatureC ?? bazaTemp;
  const { gammaCPerM, inversionDetected } = computeDynamicGradient(bazaTemp, sanTemp);
  const rawInterpolatedTempC = estimateLlanoTemperature(bazaTemp, gammaCPerM);
  const windSpeed2mMs = radiationWind.windSpeed2mKmh / 3.6;
  const micro = computeLlanoMicroclimate(Math.round(rawInterpolatedTempC * 10) / 10, windSpeed2mMs, radiationWind.cloudCoverPct);
  let estimatedTemperatureC = micro.correctedTempC;

  const dynamicBias = await getDynamicResidualBias();
  if (Math.abs(dynamicBias) > 0.05) {
    estimatedTemperatureC = Math.round((estimatedTemperatureC - dynamicBias) * 10) / 10;
  }

  estimatedTemperatureC = temporalSmoothedTemp(estimatedTemperatureC);
  cacheSet("climate:llano:smoothed_temp", estimatedTemperatureC, 30 * 60 * 1000);

  let realTemperatureC = localStation?.temperatureC ?? null;
  const realHumidityPct = localStation?.humidityPct ?? null;

  if (realTemperatureC !== null) {
    const deviation = Math.abs(realTemperatureC - estimatedTemperatureC);
    const maxDeviation = getModelParam("local_station_max_deviation_c");
    if (deviation > maxDeviation) {
      warnings.push(
        `Sensor local descartado: ${realTemperatureC.toFixed(1)}\u00b0C vs estimacion ${estimatedTemperatureC.toFixed(1)}\u00b0C (desviacion ${deviation.toFixed(1)}\u00b0C > umbral ${maxDeviation.toFixed(1)}\u00b0C)`
      );
      realTemperatureC = null;
    }
  }

  let blendedTemperatureC: number | null = null;
  if (realTemperatureC !== null && localStationAgeMin !== null) {
    const weight = sensorWeightByAge(localStationAgeMin);
    if (weight > 0) {
      blendedTemperatureC = Math.round((weight * realTemperatureC + (1 - weight) * estimatedTemperatureC) * 10) / 10;
    }
  }

  const bazaIsRealAemet = baza.source === "AEMET" && baza.status === "OK";
  let pressureHPa: number;
  if (localStation?.pressureHPa) {
    pressureHPa = localStation.pressureHPa;
  } else if (bazaIsRealAemet && baza.pressureHPa != null && baza.temperatureC != null) {
    pressureHPa = Math.round(
      barometricPressureHPa(baza.elevationM, LLANO.elevation, baza.temperatureC, baza.pressureHPa) * 10
    ) / 10;
  } else {
    pressureHPa = Math.round(pressureFromElevation(LLANO.elevation) * 10 * 10) / 10;
  }

  const extrapolation = buildExtrapolation(baza, Math.round(rawInterpolatedTempC * 10) / 10, pressureHPa, bazaWindDirectionDeg);
  const effectiveTemperatureC = blendedTemperatureC ?? realTemperatureC ?? estimatedTemperatureC;
  const effectiveHumidityPct = realHumidityPct ?? extrapolation.humidityPct;
  const dewPointC = realTemperatureC !== null && realHumidityPct !== null
    ? Math.round(dewPoint(realTemperatureC, realHumidityPct) * 10) / 10
    : exoticVars.dewPoint2mC !== null
      ? exoticVars.dewPoint2mC
      : effectiveHumidityPct !== null
        ? Math.round(dewPoint(effectiveTemperatureC, effectiveHumidityPct) * 10) / 10
        : null;
  const frostRisk = computeFrostRisk(effectiveTemperatureC, dewPointC);
  const etoInputsValid = effectiveHumidityPct !== null && pressureHPa !== null;
  const etoComputed = etoInputsValid
    ? computeHourlyEto({ temperatureC: effectiveTemperatureC, humidityPct: effectiveHumidityPct, pressureHPa, solarRadiationWm2: radiationWind.solarRadiationWm2, windSpeed2mKmh: radiationWind.windSpeed2mKmh })
    : null;
  const residualC = realTemperatureC !== null ? Math.round((estimatedTemperatureC - realTemperatureC) * 10) / 10 : null;

  if (residualC !== null && Math.abs(residualC) > 0.5) {
    const feedbackFactor = getModelParam("dynamic_residual_feedback_factor");
    const prevBias = cacheGet<number>("climate:dynamic_residual_bias") ?? 0;
    const newBias = prevBias * 0.7 + residualC * feedbackFactor * 0.3;
    cacheSet("climate:dynamic_residual_bias", Math.round(newBias * 100) / 100, 120 * 60 * 1000);
    warnings.push(`Sesgo dinámico aplicado: ${residualC > 0 ? "sobreestimación" : "subestimación"} de ${Math.abs(residualC).toFixed(1)}°C detectada, corrección progresiva activa`);
  }

  if (micro.inversionConditions) warnings.push("Inversión nocturna detectada: drenaje catabático activo en la cubeta del llano");
  if (micro.coldAirDrainageC < 0) warnings.push(`Corrección de drenaje de aire frío: ${micro.coldAirDrainageC}°C`);
  if (blendedTemperatureC !== null && blendedTemperatureC !== effectiveTemperatureC) {
    const weight = localStationAgeMin !== null ? sensorWeightByAge(localStationAgeMin) : 0;
    warnings.push(`Sensor local (${localStationAgeMin?.toFixed(0)} min) mezclado con peso ${(weight * 100).toFixed(0)}%`);
  }

  const structuralWarnings = warnings.filter(w =>
    !w.includes("drenaje") &&
    !w.includes("Inversión") &&
    !w.includes("Sensor local") &&
    !w.includes("sensor propio") &&
    !w.includes("sesgo dinámico")
  );
  const missingPenalty = structuralWarnings.length * 8;

  const maxAgeMin = Math.max(
    nodeAgeMin(baza),
    nodeAgeMin(sanClemente),
  );
  const agePenaltyMax = getModelParam("confidence_age_penalty_max");
  const agePenaltyDivisor = getModelParam("confidence_age_penalty_divisor");
  const agePenalty = Math.min(agePenaltyMax, maxAgeMin / agePenaltyDivisor);

  const localStationUsable = localStation !== null && realTemperatureC !== null;
  const localStationPenalty = localStationUsable ? 0 : sanClementeRaw.status === "OK" ? 6 : 15;
  let confidencePct = Math.max(35, Math.min(95, 92 - missingPenalty - localStationPenalty - agePenalty));
  confidencePct = Math.round(confidencePct);

  return {
    location: LLANO,
    generatedAt: new Date().toISOString(),
    nodes: { baza, sanClemente, localStation, radiationWind },
    interpolation: {
      inversionDetected,
      dynamicGradientCPerM: Math.round(gammaCPerM * 100000) / 100000,
      dynamicGradientCPer100m: Math.round(gammaCPerM * 100 * 100) / 100,
      estimatedTemperatureC,
      formula: "T_llano = T_baza - gamma_dinamico * (h_llano - h_baza)",
    },
    dewPoint: {
      dewPointC,
      frostRisk,
      blackFrostRisk: dewPointC !== null && effectiveTemperatureC <= 0 && (effectiveTemperatureC - dewPointC) >= 2,
    },
    eto: {
      etoHourlyMm: etoComputed?.etoHourlyMm ?? null,
      method: "FAO56_HOURLY_PM",
      inputs: {
        temperatureC: effectiveTemperatureC,
        humidityPct: effectiveHumidityPct,
        pressureKPa: etoComputed?.pressureKPa ?? (pressureHPa ? Math.round((pressureHPa / 10) * 100) / 100 : null),
        solarRadiationWm2: radiationWind.solarRadiationWm2,
        netRadiationMJm2h: etoComputed?.netRadiationMJm2h ?? 0,
        windSpeed2mMs: etoComputed?.windSpeed2mMs ?? Math.round((radiationWind.windSpeed2mKmh / 3.6) * 100) / 100,
      },
    },
    calibration: {
      realTemperatureC,
      residualC,
      residualDefinition: "estimated_minus_real",
      canTrainModel: residualC !== null,
    },
    microclimate: {
      hourMadrid: micro.hourMadrid,
      isNighttime: micro.isNighttime,
      inversionConditions: micro.inversionConditions,
      windSpeed2mMs: Math.round(windSpeed2mMs * 100) / 100,
      coldAirDrainageC: micro.coldAirDrainageC,
      urbanHeatIslandC: micro.urbanHeatIslandC,
      totalCorrectionC: micro.totalCorrectionC,
      rawInterpolatedTempC: Math.round(rawInterpolatedTempC * 10) / 10,
      reservoirHumidityReductionPct: getModelParam("reservoir_humidity_bias_pct"),
      rainfallFoehnFactor: getModelParam("rainfall_foehn_factor"),
      windGustReductionFactor: getModelParam("wind_gust_reduction_factor"),
    },
    extrapolation,
    exoticVariables: {
      cloudCoverPct: exoticVars.cloudCoverPct,
      dewPoint2mC: exoticVars.dewPoint2mC,
      vapourPressureDeficitKPa: exoticVars.vapourPressureDeficitKPa,
      directRadiationWm2: exoticVars.directRadiationWm2,
      diffuseRadiationWm2: exoticVars.diffuseRadiationWm2,
      visibilityM: exoticVars.visibilityM,
      uvIndex: exoticVars.uvIndex,
      capeJkg: exoticVars.capeJkg,
      isDay: exoticVars.isDay,
      soilTemp10cmC: exoticVars.soilTemp10cmC,
      soilTemp40cmC: exoticVars.soilTemp40cmC,
      soilMoisture0To1cm: exoticVars.soilMoisture0To1cm,
      soilMoisture1To3cm: exoticVars.soilMoisture1To3cm,
      soilMoisture3To9cm: exoticVars.soilMoisture3To9cm,
      soilMoisture9To27cm: exoticVars.soilMoisture9To27cm,
      soilMoisture27To81cm: exoticVars.soilMoisture27To81cm,
      source: exoticVars.cloudCoverPct !== null || exoticVars.dewPoint2mC !== null || exoticVars.soilTemp10cmC !== null
        ? "open_meteo"
        : "unavailable",
    },
    quality: {
      confidencePct,
      warnings,
      breakdown: {
        basePct: 92,
        missingPenalty,
        localStationPenalty,
        agePenalty: Math.round(agePenalty),
        maxSourceAgeMin: Math.round(maxAgeMin),
        structuralWarnings,
      },
    },
  };
}
