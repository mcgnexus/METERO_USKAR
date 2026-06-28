import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

type CachedOptions<T> = {
  key: string;
  ttlMs: number;
  staleMs: number;
  load: () => Promise<T>;
  memoryKey?: string;
};

const CACHE_DIR = path.join(process.cwd(), ".runtime-cache");
const refreshLocks = new Map<string, Promise<unknown>>();

function cacheFilePath(key: string): string {
  return path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`);
}

async function ensureCacheDir(): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
}

async function readEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await readFile(cacheFilePath(key), "utf8");
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (typeof parsed?.timestamp !== "number" || !("data" in parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeEntry<T>(key: string, data: T): Promise<void> {
  try {
    await ensureCacheDir();
    const filePath = cacheFilePath(key);
    const tmpPath = `${filePath}.tmp`;
    await writeFile(tmpPath, JSON.stringify({ timestamp: Date.now(), data }), "utf8");
    await rename(tmpPath, filePath);
  } catch {
    // Ignore cache write failures.
  }
}

async function deleteTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch {
    // Ignore cleanup failures.
  }
}

async function refreshValue<T>(opts: CachedOptions<T>): Promise<T> {
  const value = await opts.load();
  cacheSet(opts.memoryKey ?? opts.key, value, opts.ttlMs);
  await writeEntry(opts.key, value);
  return value;
}

function triggerBackgroundRefresh<T>(opts: CachedOptions<T>): void {
  if (refreshLocks.has(opts.key)) return;
  const lock = refreshValue(opts)
    .catch(() => undefined)
    .finally(() => {
      refreshLocks.delete(opts.key);
    });
  refreshLocks.set(opts.key, lock);
}

export async function getCachedOrRefresh<T>(opts: CachedOptions<T>): Promise<T> {
  const memoryKey = opts.memoryKey ?? opts.key;
  const memoryCached = cacheGet<T>(memoryKey);
  if (memoryCached) {
    return memoryCached;
  }

  const entry = await readEntry<T>(opts.key);
  const ageMs = entry ? Date.now() - entry.timestamp : Number.POSITIVE_INFINITY;

  if (entry && ageMs < opts.ttlMs) {
    cacheSet(memoryKey, entry.data, Math.max(1_000, opts.ttlMs - ageMs));
    return entry.data;
  }

  if (entry && ageMs < opts.staleMs) {
    cacheSet(memoryKey, entry.data, 15_000);
    triggerBackgroundRefresh(opts);
    return entry.data;
  }

  try {
    return await refreshValue(opts);
  } catch (error) {
    if (entry) {
      cacheSet(memoryKey, entry.data, 15_000);
      return entry.data;
    }
    throw error;
  }
}
