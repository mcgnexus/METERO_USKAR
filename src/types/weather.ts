export type CurrentWeather = {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  weatherCode: number;
  windSpeedKmh: number;
  windDirectionDeg: number;
  windGustKmh: number;
  solarRadiationWm2: number;
  et0Mm: number;
};

export type SourceObservation = {
  source: "AEMET" | "OPEN_METEO";
  stationId?: string;
  locationName: string;
  time: string;
  observationPeriod: "current" | "daily";
  dataAgeMinutes: number;
  qualityScore: number;
  status: "OK" | "Retrasada";
  retrievalStatus?: "LIVE" | "FRESH_CACHE" | "STALE_CACHE";
  elevationM?: number;
  rawTemperatureC?: number;
  altitudeCorrectionC?: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  windGustKmh: number;
};

export type WeatherPayload = {
  location: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  source: "FUSED" | "OPEN_METEO" | "AEMET" | "ERROR";
  fetchedAt: string;
  confidencePct: number;
  confidenceExplanation: string;
  current: CurrentWeather;
  sources: SourceObservation[];
  sourceHealth: SourceHealth[];
  hourly: HourlyWeather;
  comparisonHourly: ComparisonHourlyWeather;
  daily: DailyWeather;
  alerts: WeatherAlert[];
  lightning?: LightningData;
  agricultural?: AgriculturalData;
  livestock?: LivestockData;
};

export type WeatherAlert = {
  type: string;
  level: "aviso" | "peligro" | "severo";
  title: string;
  message: string;
};

export type SourceHealth = {
  source: "AEMET" | "OPEN_METEO";
  status: "OK" | "DEGRADED" | "ERROR";
  checkedAt: string;
  dataTime?: string;
  dataAgeMinutes?: number;
  lastError?: string;
  message: string;
};

export type HourlyWeather = {
  time: string[];
  temperatureC: number[];
  humidityPct: number[];
  precipitationProbabilityPct: number[];
  precipitationMm: number[];
  weatherCode: number[];
  windSpeedKmh: number[];
};

export type ComparisonHourlyWeather = {
  aemet: { time: string[]; temperatureC: number[] } | null;
  openMeteo: { time: string[]; temperatureC: number[] } | null;
};

export type DailyWeather = {
  time: string[];
  temperatureMaxC: number[];
  temperatureMinC: number[];
  precipitationProbabilityPct: number[];
  precipitationSumMm: number[];
  windGustKmh: number[];
  et0Mm: number[];
  weatherCode: number[];
};

export type LightningStrike = {
  time: string;
  lat: number;
  lon: number;
  distanceKm: number;
  bearing: string;
};

export type LightningData = {
  active: boolean;
  level: "info" | "precaucion" | "alerta" | "peligro";
  nearestStrikeKm: number | null;
  strikeCount: number;
  strikes: LightningStrike[];
  lastCheckedAt: string;
  source: "blitzortung" | "unavailable";
  message: string;
};

export type AgriculturalData = {
  et0CumulativeMm: number;
  gddCumulative: number;
  chillHours: number;
  frostRisk48h: "none" | "media" | "alta" | "muy_alta";
  workability: { workable: boolean; reasons: string[] };
};

export type LivestockData = {
  thi: number;
  level: "ninguno" | "leve" | "moderado" | "severo" | "peligroso";
  affectedLivestock: string;
};

export type ComarcaEstimation = {
  location: string;
  latitude: number;
  longitude: number;
  elevation: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  confidencePct: number;
};

export type GeographicProfile = {
  locationId: string;
  locationName: string;
  latitude: number;
  longitude: number;
  elevation: number;
  elevationRange: number;
  valleyExposure: number;
  microclimate: "VALLEY" | "PIEDMONT" | "EXPOSED_PLATEAU" | "MIXED_RELIEF";
  waterBodies: { distanceKm: number; type: string }[];
  forestCover: number;
  ndvi: number | null;
  ndwi: number | null;
  generatedAt: string;
};

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

export interface AemetWarning {
  type: string;
  level: "aviso" | "peligro" | "severo";
  title: string;
  message: string;
  startTime: string;
  endTime: string;
}

export type FetchStatus = "LIVE" | "FRESH_CACHE" | "STALE_CACHE";

export type AdminSession = {
  role: "admin";
  expiresAt: number;
};

export type GeoPoint = {
  lat: number;
  lon: number;
};
