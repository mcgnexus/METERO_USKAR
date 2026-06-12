import type { SourceObservation, HourlyWeather, DailyWeather } from "@/types/weather";

export interface OpenMeteoForecastResult {
  observations: SourceObservation[];
  hourly: HourlyWeather;
  daily: DailyWeather;
  status: "LIVE" | "FRESH_CACHE" | "STALE_CACHE";
}

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  elevation: number
): Promise<OpenMeteoForecastResult> {
  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_gusts_10m_max,et0_fao_evapotranspiration,weather_code` +
    `&timezone=auto&forecast_days=3`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status}`);
  }

  const data = await response.json();

  const now = new Date();
  const observation: SourceObservation = {
    source: "OPEN_METEO",
    locationName: "Huescar",
    time: data.current?.time ?? now.toISOString(),
    observationPeriod: "current",
    dataAgeMinutes: 0,
    qualityScore: 0.9,
    status: "OK",
    retrievalStatus: "LIVE",
    temperatureC: data.current?.temperature_2m ?? 0,
    humidityPct: data.current?.relative_humidity_2m ?? 0,
    precipitationMm: data.current?.precipitation ?? 0,
    windSpeedKmh: data.current?.wind_speed_10m ?? 0,
    windGustKmh: data.current?.wind_gusts_10m ?? 0,
  };

  const hourly: HourlyWeather = {
    time: data.hourly?.time ?? [],
    temperatureC: data.hourly?.temperature_2m ?? [],
    humidityPct: data.hourly?.relative_humidity_2m ?? [],
    precipitationProbabilityPct: data.hourly?.precipitation_probability ?? [],
    precipitationMm: data.hourly?.precipitation ?? [],
    weatherCode: data.hourly?.weather_code ?? [],
    windSpeedKmh: data.hourly?.wind_speed_10m ?? [],
  };

  const daily: DailyWeather = {
    time: data.daily?.time ?? [],
    temperatureMaxC: data.daily?.temperature_2m_max ?? [],
    temperatureMinC: data.daily?.temperature_2m_min ?? [],
    precipitationProbabilityPct: data.daily?.precipitation_probability_max ?? [],
    precipitationSumMm: data.daily?.precipitation_sum ?? [],
    windGustKmh: data.daily?.wind_gusts_10m_max ?? [],
    et0Mm: data.daily?.et0_fao_evapotranspiration ?? [],
    weatherCode: data.daily?.weather_code ?? [],
  };

  return { observations: [observation], hourly, daily, status: "LIVE" };
}
