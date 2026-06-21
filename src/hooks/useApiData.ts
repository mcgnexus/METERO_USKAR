'use client';

import { useCallback, useEffect, useState } from 'react';

const CACHE_TTL_MS = 120_000;
const REFRESH_INTERVAL_MS = 180_000;

export interface UseApiDataResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  refresh: () => void;
}

export function useApiData<T>(url: string, cacheKey?: string): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      const json = (await res.json()) as T;
      if (cacheKey) {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: json, timestamp: Date.now() }));
      }
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [url, cacheKey]);

  useEffect(() => {
    if (cacheKey) {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            setData(parsed.data as T);
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
