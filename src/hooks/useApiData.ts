'use client';

import { useCallback, useEffect, useState } from 'react';

const CACHE_TTL_MS = 120_000;
const PERSIST_TTL_MS = 86_400_000; // 24h: datos offline sirven hasta 24h
const REFRESH_INTERVAL_MS = 180_000;

export interface UseApiDataResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  isStale: boolean;
  cachedAt: number | null;
  refresh: () => void;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  isStale: boolean;
  cachedAt: number | null;
}

function readSessionCache<T>(cacheKey?: string): { data: T; timestamp: number } | null {
  if (!cacheKey || typeof window === 'undefined') return null;
  const cached = sessionStorage.getItem(cacheKey);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached) as { data: T; timestamp: number };
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) return parsed;
  } catch {
    sessionStorage.removeItem(cacheKey);
  }
  return null;
}

function readPersistedCache<T>(cacheKey?: string): { data: T; timestamp: number } | null {
  if (!cacheKey || typeof window === 'undefined') return null;
  const lsKey = `${cacheKey}__persist`;
  const raw = localStorage.getItem(lsKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { data: T; timestamp: number };
    if (Date.now() - parsed.timestamp < PERSIST_TTL_MS) return parsed;
  } catch {
    localStorage.removeItem(lsKey);
  }
  return null;
}

function getInitialState<T>(cacheKey?: string, initialData?: T | null): ApiState<T> {
  // During hydration the client must render the exact same snapshot as the server.
  // Browser caches can be used only when there is no server-provided data.
  if (initialData !== undefined && initialData !== null) {
    return { data: initialData, loading: false, isStale: false, cachedAt: null };
  }

  const session = readSessionCache<T>(cacheKey);
  if (session) return { data: session.data, loading: false, isStale: false, cachedAt: session.timestamp };

  const persisted = readPersistedCache<T>(cacheKey);
  if (persisted) return { data: persisted.data, loading: false, isStale: true, cachedAt: persisted.timestamp };

  return { data: null, loading: true, isStale: false, cachedAt: null };
}

export function useApiData<T>(url: string, cacheKey?: string, initialData?: T | null): UseApiDataResult<T> {
  const [state, setState] = useState<ApiState<T>>(() => getInitialState(cacheKey, initialData));
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const loadData = useCallback(async (): Promise<T> => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return (await res.json()) as T;
  }, [url]);

  const fetchData = useCallback(async () => {
    try {
      const json = await loadData();
      setState({ data: json, loading: false, isStale: false, cachedAt: Date.now() });
      setError(null);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      setState((current) => {
        if (current.data !== null) {
          return { ...current, loading: false, isStale: true };
        }
        const persisted = readPersistedCache<T>(cacheKey);
        if (persisted) {
          return { data: persisted.data, loading: false, isStale: true, cachedAt: persisted.timestamp };
        }
        return { ...current, loading: false };
      });
    }
  }, [loadData, cacheKey]);

  useEffect(() => {
    if (!state.loading || state.data !== null) return;
    let active = true;

    loadData()
      .then((json) => {
        if (!active) return;
        setState({ data: json, loading: false, isStale: false, cachedAt: Date.now() });
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        const persisted = readPersistedCache<T>(cacheKey);
        if (persisted) {
          setState({ data: persisted.data, loading: false, isStale: true, cachedAt: persisted.timestamp });
        } else {
          setState((current) => ({ ...current, loading: false }));
        }
      });

    return () => { active = false; };
  }, [loadData, cacheKey, state.data, state.loading]);

  useEffect(() => {
    if (!cacheKey || typeof window === 'undefined' || state.data === null) return;
    const payload = JSON.stringify({ data: state.data, timestamp: state.cachedAt ?? Date.now() });
    sessionStorage.setItem(cacheKey, payload);
    localStorage.setItem(`${cacheKey}__persist`, payload);
  }, [cacheKey, state.data, state.cachedAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      void fetchData();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (isOnline && state.isStale) {
      void fetchData();
    }
  }, [isOnline, state.isStale, fetchData]);

  return {
    data: state.data,
    error,
    loading: state.loading,
    isStale: state.isStale,
    cachedAt: state.cachedAt,
    refresh: () => { void fetchData(); },
  };
}
