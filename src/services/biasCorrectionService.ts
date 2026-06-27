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
  dewPointC: number | null;
  vapourPressureDeficitKPa: number | null;
  pressureHPa: number | null;
  solarRadiationWm2: number | null;
  directRadiationWm2: number | null;
  diffuseRadiationWm2: number | null;
  windSpeed10mKmh: number | null;
  windSpeed2mKmh: number | null;
  cloudCoverPct: number | null;
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
  dewPointC?: number | null;
  vapourPressureDeficitKPa?: number | null;
  pressureHPa: number | null;
  solarRadiationWm2: number | null;
  directRadiationWm2?: number | null;
  diffuseRadiationWm2?: number | null;
  windSpeed10mKmh: number | null;
  cloudCoverPct: number | null;
  visibilityM?: number | null;
  uvIndex?: number | null;
  capeJkg?: number | null;
  isDay?: boolean | null;
  soilTemp10cmC: number | null;
  soilTemp40cmC: number | null;
  soilMoisture0To1cm?: number | null;
  soilMoisture1To3cm?: number | null;
  soilMoisture3To9cm?: number | null;
  soilMoisture9To27cm?: number | null;
  soilMoisture27To81cm?: number | null;
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
  const correctedWind10m = raw.windSpeed10mKmh !== null
    ? Math.max(0, Math.round((raw.windSpeed10mKmh - bias.windAll) * 100) / 100)
    : null;
  const correctedWind2m = correctedWind10m !== null
    ? Math.round(correctedWind10m * 0.748 * 100) / 100
    : null;
  const correctedRad = raw.solarRadiationWm2 !== null
    ? Math.max(0, raw.solarRadiationWm2 - bias.radiationAll)
    : null;

  return {
    time: raw.time,
    temperatureC: correctedTemp,
    humidityPct: correctedHum,
    dewPointC: raw.dewPointC ?? null,
    vapourPressureDeficitKPa: raw.vapourPressureDeficitKPa ?? null,
    pressureHPa: raw.pressureHPa,
    solarRadiationWm2: correctedRad,
    directRadiationWm2: raw.directRadiationWm2 ?? null,
    diffuseRadiationWm2: raw.diffuseRadiationWm2 ?? null,
    windSpeed10mKmh: correctedWind10m,
    windSpeed2mKmh: correctedWind2m,
    cloudCoverPct: raw.cloudCoverPct,
    visibilityM: raw.visibilityM ?? null,
    uvIndex: raw.uvIndex ?? null,
    capeJkg: raw.capeJkg ?? null,
    isDay: raw.isDay ?? null,
    soilTemp10cmC: raw.soilTemp10cmC,
    soilTemp40cmC: raw.soilTemp40cmC,
    soilMoisture0To1cm: raw.soilMoisture0To1cm ?? null,
    soilMoisture1To3cm: raw.soilMoisture1To3cm ?? null,
    soilMoisture3To9cm: raw.soilMoisture3To9cm ?? null,
    soilMoisture9To27cm: raw.soilMoisture9To27cm ?? null,
    soilMoisture27To81cm: raw.soilMoisture27To81cm ?? null,
    biasApplied: {
      temperature: Math.round(tempBias * 100) / 100,
      humidity: Math.round(bias.humidityAll * 100) / 100,
      wind: Math.round(bias.windAll * 100) / 100,
      radiation: Math.round(bias.radiationAll * 100) / 100,
    },
  };
}
