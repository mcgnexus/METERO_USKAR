import { useState, useEffect, useCallback } from 'react';
import { WeatherPayload } from '@/types/weather';

const CACHE_DURATION_MS = 120_000;
const REFRESH_INTERVAL_MS = 180_000;

export function useWeatherData(cacheKey?: string): {
  data: WeatherPayload | null;
  error: Error | null;
  loading: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/weather/current', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const json: WeatherPayload = await res.json();
      if (cacheKey) {
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ data: json, timestamp: Date.now() })
        );
      }
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_DURATION_MS) {
            setData(parsed.data);
            setLoading(false);
            return;
          }
        } catch {
          sessionStorage.removeItem(cacheKey);
        }
      }
    }
    fetchData();
  }, [cacheKey, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, error, loading, refresh: fetchData };
}
