'use client';

import { useApiData } from '@/hooks/useApiData';
import type { ForecastPayload } from '@/types/forecast';

export type { ForecastPayload, ForecastDay, ForecastDaySummary, ForecastHour, BiasCorrection } from '@/types/forecast';

export function useForecast(days = 14, cacheKey = 'forecast-bias-corrected', initialData?: ForecastPayload | null) {
  return useApiData<ForecastPayload>(`/api/weather/forecast?days=${days}`, cacheKey, initialData);
}
