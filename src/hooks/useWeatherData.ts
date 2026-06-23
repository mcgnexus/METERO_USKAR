import { useApiData } from '@/hooks/useApiData';
import type { WeatherPayload } from '@/types/weather';

export function useWeatherData(cacheKey?: string, initialData?: WeatherPayload | null) {
  return useApiData<WeatherPayload>('/api/weather/current', cacheKey, initialData);
}
