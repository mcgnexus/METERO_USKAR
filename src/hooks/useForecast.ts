'use client';

import { useApiData } from '@/hooks/useApiData';

export interface ForecastDaySummary {
  date: string;
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
}

export interface BiasCorrection {
  computedAt: string;
  sampleCount: number;
  temperature: { all: number; day: number; night: number };
  humidity: number;
  wind: number;
  radiation: number;
}

export interface ForecastPayload {
  location: { lat: number; lon: number; elevation: number };
  generatedAt: string;
  forecastSource: string;
  biasCorrection: BiasCorrection;
  forecastDays: Array<{
    date: string;
    dailySummary: ForecastDaySummary;
  }>;
}

export function useForecast(days = 7, cacheKey = 'forecast-bias-corrected') {
  return useApiData<ForecastPayload>(`/api/weather/forecast?days=${days}`, cacheKey);
}
