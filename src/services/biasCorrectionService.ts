import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import { getAggregatedValidation } from "@/lib/weatherStore";

const BIAS_CACHE_TTL_MS = 60 * 60 * 1000;

export interface OpenMeteoBiasSet {
  temperatureAll: number;
  temperatureDay: number;
  temperatureNight: number;
  humidityAll: number;
  windAll: number;
  radiationAll: number;
  sampleCount: number;
  computedAt: string;
}

const EMPTY_BIAS: OpenMeteoBiasSet = {
  temperatureAll: 0,
  temperatureDay: 0,
  temperatureNight: 0,
  humidityAll: 0,
  windAll: 0,
  radiationAll: 0,
  sampleCount: 0,
  computedAt: new Date(0).toISOString(),
};

export async function getOpenMeteoBias(): Promise<OpenMeteoBiasSet> {
  const cacheKey = "bias:openmeteo";
  const cached = cacheGet<OpenMeteoBiasSet>(cacheKey);
  if (cached) return cached;

  try {
    const agg = await getAggregatedValidation(30);
    const result: OpenMeteoBiasSet = {
      temperatureAll: agg["OPEN_METEO_temperature_all_all"]?.avgBias ?? 0,
      temperatureDay: agg["OPEN_METEO_temperature_dia_all"]?.avgBias ?? agg["OPEN_METEO_temperature_all_all"]?.avgBias ?? 0,
      temperatureNight: agg["OPEN_METEO_temperature_noche_all"]?.avgBias ?? agg["OPEN_METEO_temperature_all_all"]?.avgBias ?? 0,
      humidityAll: agg["OPEN_METEO_humidity_all_all"]?.avgBias ?? 0,
      windAll: agg["OPEN_METEO_wind_all_all"]?.avgBias ?? 0,
      radiationAll: agg["OPEN_METEO_radiation_all_all"]?.avgBias ?? 0,
      sampleCount: agg["OPEN_METEO_temperature_all_all"]?.totalSamples ?? 0,
      computedAt: new Date().toISOString(),
    };
    cacheSet(cacheKey, result, BIAS_CACHE_TTL_MS);
    return result;
  } catch {
    return EMPTY_BIAS;
  }
}

export function selectTemperatureBias(bias: OpenMeteoBiasSet, hourMadrid: number): number {
  const isNight = hourMadrid < 8 || hourMadrid >= 20;
  return isNight ? bias.temperatureNight : bias.temperatureDay;
}

export interface CorrectedHour {
  time: string;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHPa: number | null;
  solarRadiationWm2: number | null;
  windSpeed2mKmh: number | null;
  cloudCoverPct: number | null;
  soilTemp10cmC: number | null;
  soilTemp40cmC: number | null;
  biasApplied: {
    temperature: number;
    humidity: number;
    wind: number;
    radiation: number;
  };
}

export interface RawHour {
  time: string;
  temperatureC: number | null;
  humidityPct: number | null;
  pressureHPa: number | null;
  solarRadiationWm2: number | null;
  windSpeed10mKmh: number | null;
  cloudCoverPct: number | null;
  soilTemp10cmC: number | null;
  soilTemp40cmC: number | null;
}

function getHourMadridFromISO(iso: string): number {
  const d = new Date(iso);
  return parseInt(
    new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hour12: false }).format(d),
    10
  );
}

export function correctForecastHour(raw: RawHour, bias: OpenMeteoBiasSet): CorrectedHour {
  const hourMadrid = getHourMadridFromISO(raw.time);
  const tempBias = selectTemperatureBias(bias, hourMadrid);

  const correctedTemp = raw.temperatureC !== null
    ? Math.round((raw.temperatureC - tempBias) * 10) / 10
    : null;
  const correctedHum = raw.humidityPct !== null
    ? Math.min(100, Math.max(0, raw.humidityPct - bias.humidityAll))
    : null;
  const correctedWind = raw.windSpeed10mKmh !== null
    ? Math.round((raw.windSpeed10mKmh - bias.windAll) * 100) / 100
    : null;
  const correctedRad = raw.solarRadiationWm2 !== null
    ? Math.max(0, raw.solarRadiationWm2 - bias.radiationAll)
    : null;

  return {
    time: raw.time,
    temperatureC: correctedTemp,
    humidityPct: correctedHum,
    pressureHPa: raw.pressureHPa,
    solarRadiationWm2: correctedRad,
    windSpeed2mKmh: correctedWind,
    cloudCoverPct: raw.cloudCoverPct,
    soilTemp10cmC: raw.soilTemp10cmC,
    soilTemp40cmC: raw.soilTemp40cmC,
    biasApplied: {
      temperature: Math.round(tempBias * 100) / 100,
      humidity: Math.round(bias.humidityAll * 100) / 100,
      wind: Math.round(bias.windAll * 100) / 100,
      radiation: Math.round(bias.radiationAll * 100) / 100,
    },
  };
}
