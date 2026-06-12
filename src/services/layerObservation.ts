import { fetchAEMETObservations } from "@/services/aemetClient";
import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastClient";
import { correctTemperatureByAltitude } from "@/services/altitudeCorrection";
import { calculateConsensusConfidence } from "@/services/consensusConfidence";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { HUESCAR_COORDS } from "@/lib/geo";
import type { CurrentWeather, SourceObservation, SourceHealth, HourlyWeather, ComparisonHourlyWeather, DailyWeather } from "@/types/weather";

const OBSERVATION_LAYER_TIMEOUT_MS = 15000;
const HUESCAR_ELEVATION = 953;

const AEMET_WEIGHTS = { temp: 0.45, humidity: 0.40, precip: 0.35, wind: 0.35, gusts: 0.35 };
const OM_WEIGHTS = { temp: 0.35, humidity: 0.35, precip: 0.40, wind: 0.40, gusts: 0.40 };

function fetchWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

function alignToEuropeMadrid(utcTime: string): string {
  if (!utcTime) return utcTime;
  const d = new Date(utcTime);
  const offset = d.getTimezoneOffset();
  const madridOffset = 120;
  const diff = madridOffset + offset;
  return new Date(d.getTime() + diff * 60000).toISOString();
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

  const [aemetResult, omResult] = await Promise.allSettled([aemetPromise, omPromise]);

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
      const elevation = rawObs.elevationM ?? HUESCAR_ELEVATION;
      const { correctedTemperature, correction } = correctTemperatureByAltitude(
        rawObs.rawTemperatureC ?? rawObs.temperatureC,
        elevation,
        HUESCAR_ELEVATION
      );
      aemetObs = {
        ...rawObs,
        dataAgeMinutes: (Date.now() - new Date(rawObs.time).getTime()) / 60000,
        temperatureC: correctedTemperature,
        altitudeCorrectionC: correction,
        rawTemperatureC: rawObs.rawTemperatureC ?? rawObs.temperatureC,
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

  const sources: SourceObservation[] = [];
  if (aemetObs) {
    aemetObs.dataAgeMinutes = (Date.now() - new Date(aemetObs.time).getTime()) / 60000;
    sources.push(aemetObs);
  }
  if (omObs) {
    omObs.dataAgeMinutes = (Date.now() - new Date(omObs.time).getTime()) / 60000;
    sources.push(omObs);
  }

  const aemetQ = aemetObs?.qualityScore ?? 0;
  const omQ = omObs?.qualityScore ?? 0;

  function fuseValue(
    aemetVal: number | undefined,
    omVal: number | undefined,
    aemetW: number,
    omW: number
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
    return totalW > 0 ? sum / totalW : 0;
  }

  const fusedTemp = fuseValue(aemetObs?.temperatureC, omObs?.temperatureC, AEMET_WEIGHTS.temp, OM_WEIGHTS.temp);
  const fusedHum = fuseValue(aemetObs?.humidityPct, omObs?.humidityPct, AEMET_WEIGHTS.humidity, OM_WEIGHTS.humidity);
  const fusedPrecip = fuseValue(aemetObs?.precipitationMm, omObs?.precipitationMm, AEMET_WEIGHTS.precip, OM_WEIGHTS.precip);
  const fusedWind = fuseValue(aemetObs?.windSpeedKmh, omObs?.windSpeedKmh, AEMET_WEIGHTS.wind, OM_WEIGHTS.wind);
  const fusedGusts = fuseValue(aemetObs?.windGustKmh, omObs?.windGustKmh, AEMET_WEIGHTS.gusts, OM_WEIGHTS.gusts);

  const current: CurrentWeather = {
    time: new Date().toISOString(),
    temperatureC: Math.round(fusedTemp * 10) / 10,
    apparentTemperatureC: fusedTemp,
    humidityPct: Math.round(fusedHum),
    precipitationMm: Math.round(fusedPrecip * 10) / 10,
    weatherCode: omObs ? 0 : 0,
    windSpeedKmh: Math.round(fusedWind * 10) / 10,
    windDirectionDeg: omObs ? 0 : 0,
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
    sourceHealth: [aemetHealth, omHealth],
    hourly,
    comparisonHourly,
    daily,
    confidencePct,
    confidenceExplanation: explanation,
  };
}
