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
  source: "AEMET" | "OPEN_METEO" | "LOCAL_STATIONS";
  stationId?: string;
  locationName: string;
  time: string;
  observationPeriod: "current" | "daily";
  dataAgeMinutes: number;
  qualityScore: number;
  status: "OK" | "Retrasada";
  retrievalStatus?: "LIVE" | "FRESH_CACHE" | "STALE_CACHE";
  elevationM?: number;
  targetElevationM?: number;
  distanceToTargetKm?: number;
  rawTemperatureC?: number;
  altitudeCorrectionC?: number;
  distanceWeightFactor?: number;
  temperatureC: number;
  /** Temperatura aparente (wind-chill / índice de calor). Proporcionada por Open-Meteo. */
  apparentTemperatureC?: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  windGustKmh: number;
  /** Dirección del viento en grados (0-360). Proporcionada por Open-Meteo. */
  windDirectionDeg?: number;
  /** Código WMO del estado del tiempo. Proporcionado por Open-Meteo. */
  weatherCode?: number;
};

export type WeatherPayload = {
  location: string;
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  source: "FUSED" | "OPEN_METEO" | "AEMET" | "LOCAL_STATIONS" | "ERROR";
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
  radar?: RadarData;
  nowcast?: NowcastData;
  orographic?: {
    factor: number;
    classification: "barlovento" | "sotavento" | "neutro";
    description: string;
  };
};

export type WeatherAlert = {
  type: string;
  level: "aviso" | "peligro" | "severo";
  title: string;
  message: string;
};

export type SourceHealth = {
  source: "AEMET" | "OPEN_METEO" | "LOCAL_STATIONS";
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
  source: "blitzortung" | "openmeteo_fallback" | "unavailable";
  message: string;
};

export type AgriculturalData = {
  et0CumulativeMm: number;
  gddCumulative: number;
  chillHours: number;
  frostRisk48h: "none" | "media" | "alta" | "muy_alta";
  workability: { workable: boolean; reasons: string[] };
  // 1. Nuevas extensiones agrícolas premium
  recommendedIrrigationLitersM2?: number; // Riego recomendado en L/m2
  pestRisk?: {
    repiloRisk: "bajo" | "medio" | "alto";
    oliveFlyRisk: "bajo" | "medio" | "alto";
  };
  yearlyChillHoursAccumulated?: number; // Horas frío acumuladas estimadas en el año/temporada
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
  rawTemperatureC?: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  confidencePct: number;
  microclimate?: string;
  elevationRange?: number;
  valleyExposure?: number;
  altitudeCorrectionC?: number;
  nightInversionC?: number;
  windFactor?: number;
  distanceToAnchorKm?: number;
  orographicFactor?: number;
  orographicClass?: "barlovento" | "sotavento" | "neutro";
  ndvi?: number | null;
  ndwi?: number | null;
  coverage?: string | null;
  nearestWaterKm?: number | null;
  nearestWaterType?: string | null;
  nearestWaterWeight?: number;
  vegetationTempAdjC?: number;
  vegetationHumAdjPct?: number;
  vegetationDewShiftC?: number;
};

export type ZoneEstimation = {
  name: string;
  type: "URBAN" | "VEGA" | "SECANO" | "MONTE" | "RESERVOIR";
  description: string;
  latitude: number;
  longitude: number;
  elevation: number;
  temperatureC: number;
  humidityPct: number;
  precipitationMm: number;
  windSpeedKmh: number;
  confidencePct: number;
  distanceToCenterKm: number;
  microclimate?: string;
  zoneTempAdjC: number;
  zoneHumAdjPct: number;
  zoneDewShiftC: number;
  altitudeCorrectionC?: number;
  nightInversionC?: number;
  frostRisk: "none" | "media" | "alta" | "muy_alta";
  irrigationNeedMm?: number;
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

export type RadarData = {
  hasPrecipitationNearby: boolean;
  level: "ninguno" | "aviso" | "alerta" | "peligro";
  radarImageUrl: string;
  message: string;
  minutesToRain: number | null;
  lastUpdated: string;
};

export type NowcastInterval = {
  time: string;
  precipMm: number;
};

export type NowcastData = {
  intervals: NowcastInterval[];
  totalPrecipNext2h: number;
  maxIntensityMm: number;
  minutesToRain: number | null;
  minutesToEndRain: number | null;
  trajectory: "increasing" | "decreasing" | "stable" | "none";
  rainApproachingFrom: string | null;
  stormDetected: boolean;
  stormDistanceKm: number | null;
  stormBearing: string | null;
  level: "ninguno" | "aviso" | "alerta" | "peligro";
  message: string;
  lastUpdated: string;
};
