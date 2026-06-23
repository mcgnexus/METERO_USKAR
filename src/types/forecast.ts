export interface ForecastHour {
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

export interface ForecastDaySummary {
  date: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  tempMeanC: number | null;
  humidityMeanPct: number | null;
  dewPointMeanC: number | null;
  vapourPressureDeficitMeanKPa: number | null;
  windMeanKmh: number | null;
  radiationTotalMJm2: number | null;
  directRadiationTotalMJm2: number | null;
  diffuseRadiationTotalMJm2: number | null;
  cloudCoverMeanPct: number | null;
  visibilityMeanM: number | null;
  uvIndexMax: number | null;
  capeMaxJkg: number | null;
  soilTemp10cmMeanC: number | null;
  soilTemp40cmMeanC: number | null;
  soilMoisture0To1cmMean: number | null;
  soilMoisture1To3cmMean: number | null;
  soilMoisture3To9cmMean: number | null;
  soilMoisture9To27cmMean: number | null;
  soilMoisture27To81cmMean: number | null;
  et0TotalMm: number | null;
}

export interface BiasCorrection {
  computedAt: string;
  sampleCount: number;
  temperature: { all: number; day: number; night: number };
  humidity: number;
  wind: number;
  radiation: number;
}

export interface ForecastDay {
  date: string;
  dailySummary: ForecastDaySummary;
  hours: ForecastHour[];
}

export interface ForecastPayload {
  location: { lat: number; lon: number; elevation: number };
  generatedAt: string;
  forecastSource: string;
  biasCorrection: BiasCorrection;
  forecastDays: ForecastDay[];
}
