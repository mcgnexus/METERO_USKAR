import { describe, it, expect, beforeEach, vi } from 'vitest';

let storage: Record<string, string> = {};
let currentUrl = 'http://localhost';

function setupDom() {
  storage = {};
  currentUrl = 'http://localhost';

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { storage = {}; },
    },
    writable: true,
  });

  Object.defineProperty(globalThis, 'window', {
    value: {
      get location() { return new URL(currentUrl); },
      atob: (s: string) => Buffer.from(s, 'base64').toString('binary'),
    },
    writable: true,
  });

  Object.defineProperty(globalThis, 'navigator', {
    value: { serviceWorker: undefined },
    writable: true,
  });
}

describe('captureUtms', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
  });

  it('reads UTMs from URL params', async () => {
    currentUrl = 'http://localhost?utm_source=google&utm_medium=cpc&utm_campaign=spring';
    const { captureUtms } = await import('@/lib/utm');
    const result = captureUtms();
    expect(result.utm_source).toBe('google');
    expect(result.utm_medium).toBe('cpc');
    expect(result.utm_campaign).toBe('spring');
  });

  it('persists UTMs in sessionStorage', async () => {
    currentUrl = 'http://localhost?utm_source=facebook';
    const { captureUtms } = await import('@/lib/utm');
    captureUtms();
    expect(storage['meteo_utms']).toBeTruthy();
    expect(JSON.parse(storage['meteo_utms']).utm_source).toBe('facebook');
  });

  it('returns stored UTMs when no URL params', async () => {
    storage['meteo_utms'] = JSON.stringify({ utm_source: 'newsletter' });
    currentUrl = 'http://localhost';
    const { captureUtms } = await import('@/lib/utm');
    const result = captureUtms();
    expect(result.utm_source).toBe('newsletter');
  });

  it('truncates UTM values to 100 chars', async () => {
    const longValue = 'a'.repeat(200);
    currentUrl = `http://localhost?utm_source=${longValue}`;
    const { captureUtms } = await import('@/lib/utm');
    const result = captureUtms();
    expect(result.utm_source!.length).toBe(100);
  });

  it('ignores non-UTM params', async () => {
    currentUrl = 'http://localhost?foo=bar&utm_source=bing';
    const { captureUtms } = await import('@/lib/utm');
    const result = captureUtms();
    expect(result.utm_source).toBe('bing');
    expect((result as any).foo).toBeUndefined();
  });
});
