import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const FORECAST_CACHE_TTL_MS = 3 * 60 * 60 * 1000;

export interface ForecastHour {
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

export interface ForecastDay {
  date: string;
  hours: ForecastHour[];
  dailySummary: {
    tempMinC: number | null;
    tempMaxC: number | null;
    tempMeanC: number | null;
    humidityMeanPct: number | null;
    windMeanKmh: number | null;
    radiationTotalMJm2: number | null;
    cloudCoverMeanPct: number | null;
    soilTemp10cmMeanC: number | null;
    soilTemp40cmMeanC: number | null;
    et0TotalMm: number | null;
  };
}

export interface OpenMeteoForecast {
  source: "open_meteo";
  latitude: number;
  longitude: number;
  elevationM: number;
  generatedAt: string;
  forecastDays: ForecastDay[];
  hourlyCount: number;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function fetchOpenMeteoForecast(
  latitude: number,
  longitude: number,
  elevation: number,
  forecastDays: number = 7
): Promise<OpenMeteoForecast | null> {
  const cacheKey = `openmeteo:forecast:${latitude.toFixed(4)}:${longitude.toFixed(4)}:${forecastDays}`;
  const cached = cacheGet<OpenMeteoForecast>(cacheKey);
  if (cached) return cached;

  const hourlyVars = [
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "shortwave_radiation",
    "wind_speed_10m",
    "cloud_cover",
    "soil_temperature_0_to_7cm",
    "soil_temperature_28_to_100cm",
  ].join(",");

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&elevation=${elevation}&hourly=${hourlyVars}&forecast_days=${forecastDays}&timezone=Europe/Madrid`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const hourly = json.hourly;
    if (!hourly?.time || !Array.isArray(hourly.time)) return null;

    const times: string[] = hourly.time;
    const result: OpenMeteoForecast = {
      source: "open_meteo",
      latitude,
      longitude,
      elevationM: elevation,
      generatedAt: new Date().toISOString(),
      forecastDays: [],
      hourlyCount: times.length,
    };

    const dayMap = new Map<string, ForecastHour[]>();
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const dateStr = t.slice(0, 10);
      const hour: ForecastHour = {
        time: t,
        temperatureC: parseNumber(hourly.temperature_2m?.[i]),
        humidityPct: parseNumber(hourly.relative_humidity_2m?.[i]),
        pressureHPa: parseNumber(hourly.surface_pressure?.[i]),
        solarRadiationWm2: parseNumber(hourly.shortwave_radiation?.[i]),
        windSpeed10mKmh: parseNumber(hourly.wind_speed_10m?.[i]),
        cloudCoverPct: parseNumber(hourly.cloud_cover?.[i]),
        soilTemp10cmC: parseNumber(hourly.soil_temperature_0_to_7cm?.[i]),
        soilTemp40cmC: parseNumber(hourly.soil_temperature_28_to_100cm?.[i]),
      };
      if (!dayMap.has(dateStr)) dayMap.set(dateStr, []);
      dayMap.get(dateStr)!.push(hour);
    }

    for (const [date, hours] of dayMap) {
      const day = buildForecastDay(date, hours);
      result.forecastDays.push(day);
    }

    cacheSet(cacheKey, result, FORECAST_CACHE_TTL_MS);
    return result;
  } catch {
    return null;
  }
}

function buildForecastDay(date: string, hours: ForecastHour[]): ForecastDay {
  const temps = hours.map(h => h.temperatureC).filter((v): v is number => v !== null);
  const hums = hours.map(h => h.humidityPct).filter((v): v is number => v !== null);
  const winds = hours.map(h => h.windSpeed10mKmh).filter((v): v is number => v !== null);
  const rads = hours.map(h => h.solarRadiationWm2).filter((v): v is number => v !== null);
  const clouds = hours.map(h => h.cloudCoverPct).filter((v): v is number => v !== null);
  const soils10 = hours.map(h => h.soilTemp10cmC).filter((v): v is number => v !== null);
  const soils40 = hours.map(h => h.soilTemp40cmC).filter((v): v is number => v !== null);

  const sumArr = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const radiationTotalMJ = rads.length > 0
    ? rads.reduce((a, b) => a + Math.max(0, b) * 0.0036, 0)
    : null;

  return {
    date,
    hours,
    dailySummary: {
      tempMinC: temps.length > 0 ? Math.min(...temps) : null,
      tempMaxC: temps.length > 0 ? Math.max(...temps) : null,
      tempMeanC: sumArr(temps),
      humidityMeanPct: sumArr(hums),
      windMeanKmh: sumArr(winds),
      radiationTotalMJm2: radiationTotalMJ,
      cloudCoverMeanPct: sumArr(clouds),
      soilTemp10cmMeanC: sumArr(soils10),
      soilTemp40cmMeanC: sumArr(soils40),
      et0TotalMm: null,
    },
  };
}

export async function fetchCurrentCloudCover(latitude: number, longitude: number): Promise<number | null> {
  const cacheKey = `openmeteo:cloudcover:${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
  const cached = cacheGet<number>(cacheKey);
  if (cached !== null && cached !== undefined) return cached;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=cloud_cover&timezone=auto&forecast_days=1`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const v = parseNumber(json.current?.cloud_cover);
    if (v !== null) cacheSet(cacheKey, v, 30 * 60 * 1000);
    return v;
  } catch {
    return null;
  }
}
