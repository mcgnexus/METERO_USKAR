import { fetchAEMETObservations } from "@/services/aemetClient";
import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastClient";
import { correctTemperatureByAltitude } from "@/services/altitudeCorrection";
import { calculateConsensusConfidence } from "@/services/consensusConfidence";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { AEMET_HUESCAR_5051X, HUESCAR_COORDS, HUESCAR_URBAN_CENTER, haversineKm } from "@/lib/geo";
import { fetchLocalStations } from "@/services/stationService";
import { getReliefData, type ReliefData } from "@/services/reliefService";
import { applyMicroclimateCorrections } from "@/services/correctionService";
import { applyOrographicPrecipitation } from "@/services/orographicService";
import { getStationBiases, applyStationBias, recordStationComparison } from "@/services/stationCalibration";
import { dewPoint, relativeHumidity } from "@/lib/dewPoint";
import { getModelParam } from "@/services/modelParameterService";
import type { CurrentWeather, SourceObservation, SourceHealth, HourlyWeather, ComparisonHourlyWeather, DailyWeather } from "@/types/weather";

const OBSERVATION_LAYER_TIMEOUT_MS = 30000;
const HUESCAR_ELEVATION = 953;

const AEMET_WEIGHTS = { temp: 0.45, humidity: 0.40, precip: 0.35, wind: 0.35, gusts: 0.35 };
const OM_WEIGHTS = { temp: 0.35, humidity: 0.35, precip: 0.40, wind: 0.40, gusts: 0.40 };

function distanceWeightFactor(distanceKm: number): number {
  if (distanceKm <= 2) return 1;
  if (distanceKm <= 5) return Math.max(0.85, 1 - (distanceKm - 2) * 0.05);
  return Math.max(0.65, 0.85 - (distanceKm - 5) * 0.04);
}

function parseOptionalNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

// I1 — Convertir un timestamp UTC de Open-Meteo a la zona horaria Europe/Madrid.
// La versión anterior hardcodeaba +120 min (CEST), lo que era incorrecto en invierno (CET = +60).
// Ahora se usa Intl.DateTimeFormat, que aplica automáticamente el cambio de hora.
function alignToEuropeMadrid(utcTime: string): string {
  if (!utcTime) return utcTime;
  const d = new Date(utcTime);
  if (isNaN(d.getTime())) return utcTime;
  // sv-SE produce formato ISO-like: "YYYY-MM-DD HH:mm:ss"
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return formatter.format(d).replace(" ", "T") + ".000Z";
}

export async function fetchObservationLayer(): Promise<{
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
}> {
  const tolerances = await getCalibratedTolerances();

  const aemetPromise = fetchWithTimeout(
    fetchAEMETObservations().then((r) => ({ ...r, source: "AEMET" as const })),
    OBSERVATION_LAYER_TIMEOUT_MS
  );
  const omPromise = fetchWithTimeout(
    fetchOpenMeteoForecast(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, HUESCAR_COORDS.elevation).then((r) => ({ ...r, source: "OPEN_METEO" as const })),
    OBSERVATION_LAYER_TIMEOUT_MS
  );
  // Llamar en paralelo a las miniestaciones locales del municipio
  const stationsPromise = fetchWithTimeout(fetchLocalStations(), OBSERVATION_LAYER_TIMEOUT_MS);
  const reliefPromise = fetchWithTimeout(getReliefData().catch(() => null), 10000);

  const [aemetResult, omResult, stationsResult, reliefResult] = await Promise.allSettled([
    aemetPromise,
    omPromise,
    stationsPromise,
    reliefPromise,
  ]);

  const relief: ReliefData | null = reliefResult.status === "fulfilled" ? reliefResult.value : null;

  let aemetObs: SourceObservation | null = null;
  let aemetHourly: HourlyWeather | null = null;
  let aemetDaily: DailyWeather | null = null;
  let aemetHealth: SourceHealth = {
    source: "AEMET",
    status: "ERROR",
    checkedAt: new Date().toISOString(),
    message: "AEMET fetch failed or timed out",
  };

  let omObs: SourceObservation | null = null;
  let omHourly: HourlyWeather | null = null;
  let omDaily: DailyWeather | null = null;
  let omHealth: SourceHealth = {
    source: "OPEN_METEO",
    status: "ERROR",
    checkedAt: new Date().toISOString(),
    message: "Open-Meteo fetch failed or timed out",
  };

  if (aemetResult.status === "fulfilled") {
    const aemet = aemetResult.value;
    const obs = aemet.observations;
    if (obs.length > 0) {
      const rawObs = obs[0];
      const elevation = rawObs.elevationM ?? AEMET_HUESCAR_5051X.elevation;
      const distanceKm = haversineKm(
        AEMET_HUESCAR_5051X.lat,
        AEMET_HUESCAR_5051X.lon,
        HUESCAR_URBAN_CENTER.lat,
        HUESCAR_URBAN_CENTER.lon
      );
      const distanceFactor = distanceWeightFactor(distanceKm);
      const rawTempVal = rawObs.rawTemperatureC ?? rawObs.temperatureC;
      const rawHumVal = rawObs.humidityPct;

      const hourMadrid = parseInt(
        new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).format(new Date()),
        10
      );
      const isDaytime = hourMadrid >= 8 && hourMadrid < 20;

      const reservoirDistanceKm = AEMET_HUESCAR_5051X.reservoirDistanceKm ?? 0.28;
      const reservoirInfluence = Math.min(1.5, Math.max(0.5, Math.sqrt(0.28 / Math.max(reservoirDistanceKm, 0.05))));
      const reservoirTempBias = (isDaytime
        ? getModelParam("reservoir_temp_bias_day")
        : getModelParam("reservoir_temp_bias_night")) * reservoirInfluence;
      const reservoirDewBias = getModelParam("reservoir_dew_bias") * reservoirInfluence;

      const tempAfterReservoir = rawTempVal - reservoirTempBias;
      const tdStation = dewPoint(rawTempVal, rawHumVal);
      const tdAfterReservoir = tdStation - reservoirDewBias;
      const humAfterReservoir = relativeHumidity(tempAfterReservoir, tdAfterReservoir);

      const { correctedTemperature, correction } = correctTemperatureByAltitude(
        tempAfterReservoir,
        elevation,
        HUESCAR_URBAN_CENTER.elevation
      );

      aemetObs = {
        ...rawObs,
        dataAgeMinutes: (Date.now() - new Date(rawObs.time).getTime()) / 60000,
        qualityScore: rawObs.qualityScore * distanceFactor,
        elevationM: elevation,
        targetElevationM: HUESCAR_URBAN_CENTER.elevation,
        distanceToTargetKm: Math.round(distanceKm * 10) / 10,
        distanceWeightFactor: Math.round(distanceFactor * 100) / 100,
        temperatureC: correctedTemperature,
        altitudeCorrectionC: Math.round((correction - reservoirTempBias) * 1000) / 1000,
        rawTemperatureC: rawTempVal,
        humidityPct: Math.round(humAfterReservoir),
      };
    }
    aemetHealth = {
      source: "AEMET",
      status: obs.length > 0 ? "OK" : "DEGRADED",
      checkedAt: new Date().toISOString(),
      dataTime: aemetObs?.time,
      dataAgeMinutes: aemetObs?.dataAgeMinutes,
      message: obs.length > 0 ? "AEMET data available" : "AEMET returned no data",
    };
  } else {
    aemetHealth = {
      source: "AEMET",
      status: "ERROR",
      checkedAt: new Date().toISOString(),
      lastError: aemetResult.reason?.message ?? "unknown error",
      message: "AEMET fetch failed or timed out",
    };
  }

  if (omResult.status === "fulfilled") {
    const om = omResult.value;
    const obs = om.observations;
    if (obs.length > 0) {
      const aligned = { ...obs[0], time: alignToEuropeMadrid(obs[0].time) };
      omObs = aligned;
    }
    omHourly = om.hourly
      ? {
          ...om.hourly,
          time: om.hourly.time.map(alignToEuropeMadrid),
        }
      : null;
    omDaily = om.daily ?? null;
    omHealth = {
      source: "OPEN_METEO",
      status: obs.length > 0 ? "OK" : "DEGRADED",
      checkedAt: new Date().toISOString(),
      dataTime: obs.length > 0 ? obs[0].time : undefined,
      dataAgeMinutes: obs.length > 0 ? obs[0].dataAgeMinutes : undefined,
      message: obs.length > 0 ? "Open-Meteo data available" : "Open-Meteo returned no data",
    };
  } else {
    omHealth = {
      source: "OPEN_METEO",
      status: "ERROR",
      checkedAt: new Date().toISOString(),
      lastError: omResult.reason?.message ?? "unknown error",
      message: "Open-Meteo fetch failed or timed out",
    };
  }

  // --- PROCESADO Y PROMEDIO DE MINIESTACIONES LOCALES ---
  let localObs: SourceObservation | null = null;
  let localHealth: SourceHealth = {
    source: "LOCAL_STATIONS",
    status: "ERROR",
    checkedAt: new Date().toISOString(),
    message: "No hay miniestaciones configuradas o disponibles",
  };

  if (stationsResult.status === "fulfilled" && Array.isArray(stationsResult.value)) {
    const rawStations = stationsResult.value;
    const biases = await getStationBiases().catch(() => ({}));
    const nowMs = Date.now();

    // Filtrar únicamente miniestaciones activas con lecturas frescas (edad < 120 minutos) y válidas
    const activeFreshStations = rawStations.map((station: any) => {
      const stationId = String(station.node_code ?? station.id ?? "");
      const updatedTime = station.updated_at ?? station.ultima_actualizacion ?? station.timestamp;
      const ageMin = updatedTime ? (nowMs - new Date(updatedTime).getTime()) / 60000 : 9999;
      const lat = parseOptionalNumber(station.lat, station.latitude, station.raw?.lat, station.raw?.latitude);
      const lon = parseOptionalNumber(station.lon, station.lng, station.longitude, station.raw?.lon, station.raw?.lng, station.raw?.longitude);
      const elevation = parseOptionalNumber(station.elevation, station.elevation_m, station.altitude, station.alt, station.raw?.elevation, station.raw?.altitude);
      const rawTemperature = parseOptionalNumber(station.temperature, station.temperatura, station.temp, station.air_temp_c, station.raw?.air_temp_c);
      const rawHumidity = parseOptionalNumber(station.humidity, station.humedad, station.hr, station.air_humidity_pct, station.raw?.air_humidity_pct);
      const calibrated = applyStationBias(stationId, rawTemperature, rawHumidity, biases);
      const distanceKm = lat !== undefined && lon !== undefined
        ? haversineKm(lat, lon, HUESCAR_URBAN_CENTER.lat, HUESCAR_URBAN_CENTER.lon)
        : undefined;
      const distanceFactor = distanceKm !== undefined ? distanceWeightFactor(distanceKm) : 0.9;
      const baseTemp = calibrated.temperature ?? rawTemperature;
      const correctedTemperature = baseTemp !== undefined && elevation !== undefined
        ? correctTemperatureByAltitude(baseTemp, elevation, HUESCAR_URBAN_CENTER.elevation).correctedTemperature
        : baseTemp;
      const altitudeCorrection = baseTemp !== undefined && elevation !== undefined
        ? correctTemperatureByAltitude(baseTemp, elevation, HUESCAR_URBAN_CENTER.elevation).correction
        : undefined;
      const stationHumidity = calibrated.humidity ?? rawHumidity ?? station.humidity ?? station.humedad ?? station.hr;
      return {
        ...station,
        ageMin,
        temperature: correctedTemperature,
        rawTemperature: baseTemp !== rawTemperature ? rawTemperature : undefined,
        humidity: stationHumidity,
        rawHumidity: stationHumidity !== (rawHumidity ?? station.humidity ?? station.humedad ?? station.hr) ? (rawHumidity ?? station.humidity ?? station.humedad ?? station.hr) : undefined,
        pressure: station.pressure_hpa ?? station.presion,
        lat,
        lon,
        elevation,
        distanceKm,
        distanceFactor,
        altitudeCorrection,
      };
    }).filter((s: any) => s.ageMin < 120 && s.temperature !== undefined && s.temperature !== null);

    if (activeFreshStations.length > 0) {
      // Sumar e promediar los valores meteorológicos de todas las estaciones funcionales
      let totalTemp = 0;
      let totalHum = 0;
      let totalPressure = 0;
      let totalStationWeight = 0;
      let totalHumidityWeight = 0;
      let countPressure = 0;

      activeFreshStations.forEach((s: any) => {
        const stationWeight = s.distanceFactor ?? 0.9;
        totalTemp += s.temperature * stationWeight;
        if (s.humidity !== undefined && s.humidity !== null) {
          totalHum += s.humidity * stationWeight;
          totalHumidityWeight += stationWeight;
        }
        totalStationWeight += stationWeight;
        if (s.pressure !== undefined && s.pressure !== null) {
          totalPressure += s.pressure;
          countPressure++;
        }
      });

      const avgTemp = totalTemp / totalStationWeight;
      const avgHum = totalHumidityWeight > 0 ? totalHum / totalHumidityWeight : 0;
      const avgPressure = countPressure > 0 ? totalPressure / countPressure : 1013; // default sea level pressure
      const avgDistance = activeFreshStations
        .filter((s: any) => s.distanceKm !== undefined)
        .reduce((acc: number, s: any) => acc + s.distanceKm, 0) / Math.max(1, activeFreshStations.filter((s: any) => s.distanceKm !== undefined).length);
      const avgAltitudeCorrection = activeFreshStations
        .filter((s: any) => s.altitudeCorrection !== undefined)
        .reduce((acc: number, s: any) => acc + s.altitudeCorrection, 0) / Math.max(1, activeFreshStations.filter((s: any) => s.altitudeCorrection !== undefined).length);

      // El qualityScore aumenta proporcionalmente a la cantidad de estaciones funcionando
      const qualityScore = Math.min(1.0, (0.7 + (activeFreshStations.length * 0.05)) * (totalStationWeight / activeFreshStations.length));

      localObs = {
        source: "LOCAL_STATIONS",
        locationName: "Red Local Huéscar",
        time: new Date().toISOString(),
        observationPeriod: "current",
        dataAgeMinutes: activeFreshStations.reduce((acc: number, s: any) => acc + s.ageMin, 0) / activeFreshStations.length,
        qualityScore,
        status: "OK",
        temperatureC: avgTemp,
        rawTemperatureC: activeFreshStations.length === 1 ? activeFreshStations[0].rawTemperature : undefined,
        altitudeCorrectionC: Number.isFinite(avgAltitudeCorrection) ? avgAltitudeCorrection : undefined,
        distanceToTargetKm: Number.isFinite(avgDistance) ? Math.round(avgDistance * 10) / 10 : undefined,
        distanceWeightFactor: Math.round((totalStationWeight / activeFreshStations.length) * 100) / 100,
        targetElevationM: HUESCAR_URBAN_CENTER.elevation,
        humidityPct: avgHum,
        precipitationMm: 0, // Las miniestaciones no suelen acumular lluvia de forma promediada
        windSpeedKmh: 0,
        windGustKmh: 0,
      };

      localHealth = {
        source: "LOCAL_STATIONS",
        status: "OK",
        checkedAt: new Date().toISOString(),
        dataTime: localObs.time,
        dataAgeMinutes: localObs.dataAgeMinutes,
        message: `${activeFreshStations.length} miniestaciones operativas integradas en el consenso`,
      };
    } else if (rawStations.length > 0) {
      localHealth = {
        source: "LOCAL_STATIONS",
        status: "DEGRADED",
        checkedAt: new Date().toISOString(),
        message: "Las miniestaciones están apagadas o desactualizadas (> 120 minutos)",
      };
    }

    if (aemetObs && activeFreshStations.length > 0) {
      await Promise.allSettled(
        activeFreshStations.map((station: any) => {
          const stationId = String(station.node_code ?? station.id ?? "");
          if (!stationId) return Promise.resolve();
          const measuredAt = station.updated_at ?? station.measured_at ?? station.timestamp ?? new Date().toISOString();
          return recordStationComparison(
            stationId,
            measuredAt,
            station.rawTemperature ?? station.temperature,
            station.rawHumidity ?? station.humidity,
            aemetObs.temperatureC,
            aemetObs.humidityPct
          ).catch(() => {});
        })
      );
    }
  }

  const sources: SourceObservation[] = [];
  if (aemetObs) {
    aemetObs.dataAgeMinutes = (Date.now() - new Date(aemetObs.time).getTime()) / 60000;
    sources.push(aemetObs);
  }
  if (omObs) {
    omObs.dataAgeMinutes = (Date.now() - new Date(omObs.time).getTime()) / 60000;
    sources.push(omObs);
  }
  if (localObs) {
    sources.push(localObs);
  }

  const now = new Date();
  const hourMadrid = parseInt(
    new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).format(now),
    10
  );
  const isNight = hourMadrid < 7 || hourMadrid >= 21;

  for (const source of sources) {
    if (source.source === "AEMET" || source.source === "OPEN_METEO" || source.source === "LOCAL_STATIONS") {
      const sourceElev = source.source === "AEMET"
        ? HUESCAR_URBAN_CENTER.elevation
        : source.source === "LOCAL_STATIONS"
          ? (source.elevationM ?? HUESCAR_URBAN_CENTER.elevation)
          : HUESCAR_URBAN_CENTER.elevation;

      const windToUse = source.windSpeedKmh ?? 0;
      const corrected = applyMicroclimateCorrections(
        source.temperatureC,
        source.humidityPct,
        windToUse,
        isNight,
        sourceElev,
        HUESCAR_URBAN_CENTER.elevation,
        relief
      );
      source.temperatureC = corrected.temperatureC;
      source.humidityPct = corrected.humidityPct;
      source.windSpeedKmh = corrected.windSpeedKmh;
    }
  }

  const aemetQ = aemetObs?.qualityScore ?? 0;
  const omQ = omObs?.qualityScore ?? 0;
  const localQ = localObs?.qualityScore ?? 0;
  const LOCAL_WEIGHTS = { temp: 0.50, humidity: 0.50 }; // Gran peso para las mediciones locales directas

  function fuseValue(
    aemetVal: number | undefined,
    omVal: number | undefined,
    localVal: number | undefined,
    aemetW: number,
    omW: number,
    localW: number
  ): number {
    let totalW = 0;
    let sum = 0;
    if (aemetObs && aemetVal !== undefined) {
      sum += aemetVal * aemetW * aemetQ;
      totalW += aemetW * aemetQ;
    }
    if (omObs && omVal !== undefined) {
      sum += omVal * omW * omQ;
      totalW += omW * omQ;
    }
    if (localObs && localVal !== undefined) {
      sum += localVal * localW * localQ;
      totalW += localW * localQ;
    }
    return totalW > 0 ? sum / totalW : 0;
  }

  const fusedTemp = fuseValue(
    aemetObs?.temperatureC, 
    omObs?.temperatureC, 
    localObs?.temperatureC,
    AEMET_WEIGHTS.temp, 
    OM_WEIGHTS.temp,
    LOCAL_WEIGHTS.temp
  );
  const fusedHum = fuseValue(
    aemetObs?.humidityPct, 
    omObs?.humidityPct, 
    localObs?.humidityPct,
    AEMET_WEIGHTS.humidity, 
    OM_WEIGHTS.humidity,
    LOCAL_WEIGHTS.humidity
  );
  const fusedPrecip = fuseValue(
    aemetObs?.precipitationMm, 
    omObs?.precipitationMm, 
    undefined,
    AEMET_WEIGHTS.precip, 
    OM_WEIGHTS.precip,
    0
  );

  const windDirForOro = omObs?.windDirectionDeg ?? aemetObs?.windDirectionDeg;
  const { precipMm: orographicPrecip, orographic } = applyOrographicPrecipitation(
    fusedPrecip,
    windDirForOro,
    relief
  );
  const fusedWind = fuseValue(
    aemetObs?.windSpeedKmh, 
    omObs?.windSpeedKmh, 
    undefined,
    AEMET_WEIGHTS.wind, 
    OM_WEIGHTS.wind,
    0
  );
  const fusedGusts = fuseValue(
    aemetObs?.windGustKmh, 
    omObs?.windGustKmh, 
    undefined,
    AEMET_WEIGHTS.gusts, 
    OM_WEIGHTS.gusts,
    0
  );

  const current: CurrentWeather = {
    time: new Date().toISOString(),
    temperatureC: Math.round(fusedTemp * 10) / 10,
    // C2 — Usar la temperatura aparente real de Open-Meteo (wind-chill / índice de calor).
    // Si OM no está disponible, se aproxima con la temperatura fusionada.
    apparentTemperatureC: omObs?.apparentTemperatureC ?? Math.round(fusedTemp * 10) / 10,
    humidityPct: Math.round(fusedHum),
    precipitationMm: Math.round(orographicPrecip * 10) / 10,
    // C3 — Usar los valores reales de Open-Meteo; ya no se hardcodean a 0.
    weatherCode: omObs?.weatherCode ?? 0,
    windSpeedKmh: Math.round(fusedWind * 10) / 10,
    windDirectionDeg: omObs?.windDirectionDeg ?? 0,
    windGustKmh: Math.round(fusedGusts * 10) / 10,
    solarRadiationWm2: 0,
    et0Mm: 0,
  };

  const hourly: HourlyWeather = omHourly ?? {
    time: [],
    temperatureC: [],
    humidityPct: [],
    precipitationProbabilityPct: [],
    precipitationMm: [],
    weatherCode: [],
    windSpeedKmh: [],
  };

  const comparisonHourly: ComparisonHourlyWeather = {
    aemet: null,
    openMeteo: omHourly ? { time: omHourly.time, temperatureC: omHourly.temperatureC } : null,
  };

  const daily: DailyWeather = omDaily ?? {
    time: [],
    temperatureMaxC: [],
    temperatureMinC: [],
    precipitationProbabilityPct: [],
    precipitationSumMm: [],
    windGustKmh: [],
    et0Mm: [],
    weatherCode: [],
  };

  const { confidencePct, explanation } = calculateConsensusConfidence(sources, tolerances);

  return {
    current,
    sources,
    sourceHealth: [aemetHealth, omHealth, localHealth],
    hourly,
    comparisonHourly,
    daily,
    confidencePct,
    confidenceExplanation: explanation,
    orographic,
  };
}
