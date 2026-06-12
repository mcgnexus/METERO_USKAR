const cache = new Map<string, { data: unknown; timestamp: number; ttlMs: number }>();

export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const elapsed = Date.now() - entry.timestamp;
  if (elapsed < entry.ttlMs) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

export function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttlMs });
}

export function cacheDelete(key: string): void {
  cache.delete(key);
}

export function cacheKeys(): string[] {
  return Array.from(cache.keys());
}

export function cacheClear(): void {
  cache.clear();
}
