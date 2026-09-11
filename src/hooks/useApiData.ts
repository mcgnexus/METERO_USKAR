'use client';

import { useCallback, useEffect, useState } from 'react';

const CACHE_TTL_MS = 120_000;
const PERSIST_TTL_MS = 86_400_000; // 24h: datos offline sirven hasta 24h
const REFRESH_INTERVAL_MS = 180_000;
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_BASE_DELAY_MS = 2_000;

export interface UseApiDataResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  isStale: boolean;
  cachedAt: number | null;
  /** intentos automáticos consumidos en el último ciclo de error */
  attempts: number;
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
  // Server-provided data always wins; browser caches are only read after mount.
  if (initialData !== undefined && initialData !== null) {
    return { data: initialData, loading: false, isStale: false, cachedAt: null };
  }

  // When there is no server data, both server and client start in loading state.
  // The client will read from cache in a useEffect after hydration.
  return { data: null, loading: true, isStale: false, cachedAt: null };
}

export function useApiData<T>(url: string, cacheKey?: string, initialData?: T | null): UseApiDataResult<T> {
  const [state, setState] = useState<ApiState<T>>(() => getInitialState(cacheKey, initialData));
  const [error, setError] = useState<Error | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setIsOnline(navigator.onLine);
    sync();
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // After hydration, try to restore from browser cache if we don't have data yet.
  useEffect(() => {
    if (state.data !== null || !cacheKey) return;
    const restore = () => {
      const session = readSessionCache<T>(cacheKey);
      if (session) {
        setState({ data: session.data, loading: false, isStale: false, cachedAt: session.timestamp });
        return;
      }
      const persisted = readPersistedCache<T>(cacheKey);
      if (persisted) {
        setState({ data: persisted.data, loading: false, isStale: true, cachedAt: persisted.timestamp });
      }
    };
    const timer = setTimeout(restore, 0);
    return () => clearTimeout(timer);
  }, [cacheKey, state.data]);

  const loadData = useCallback(async (): Promise<T> => {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return (await res.json()) as T;
  }, [url]);

  const fetchData = useCallback(async () => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS + 1; attempt++) {
      try {
        setAttempts(attempt - 1);
        const json = await loadData();
        setState({ data: json, loading: false, isStale: false, cachedAt: Date.now() });
        setError(null);
        setAttempts(0);
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        setError(lastError);
        if (attempt <= MAX_RETRY_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_BASE_DELAY_MS * attempt));
        }
      }
    }
    setAttempts(MAX_RETRY_ATTEMPTS);
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
      const t = setTimeout(() => { void fetchData(); }, 0);
      return () => clearTimeout(t);
    }
  }, [isOnline, state.isStale, fetchData]);

  return {
    data: state.data,
    error,
    loading: state.loading,
    isStale: state.isStale,
    cachedAt: state.cachedAt,
    attempts,
    refresh: () => { void fetchData(); },
  };
}
