const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;
const STORAGE_KEY = 'meteo_utms';

export function captureUtms(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const found: Record<string, string> = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      found[key] = value.slice(0, 100);
    }
  }

  if (Object.keys(found).length > 0) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    } catch {}
    return found;
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}

  return {};
}
