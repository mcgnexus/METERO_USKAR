import { useApiData } from '@/hooks/useApiData';
import type { WeatherPayload } from '@/types/weather';

export function useWeatherData(cacheKey?: string) {
  return useApiData<WeatherPayload>('/api/weather/current', cacheKey);
}
