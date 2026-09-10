import { describe, it, expect, beforeEach, vi } from 'vitest';

let storage: Record<string, string> = {};
const dispatched: Array<{ type: string; detail?: unknown }> = [];

function setupDom() {
  storage = {};
  dispatched.length = 0;

  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => { storage[k] = v; },
      removeItem: (k: string) => { delete storage[k]; },
      clear: () => { storage = {}; },
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'window', {
    value: {
      dispatchEvent: (event: { type: string; detail?: unknown }) => {
        dispatched.push({ type: event.type, detail: event.detail });
        return true;
      },
    },
    writable: true,
    configurable: true,
  });

  Object.defineProperty(globalThis, 'CustomEvent', {
    value: class {
      type: string;
      detail?: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    writable: true,
    configurable: true,
  });
}

describe('consentimiento de analítica', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDom();
  });

  it('por defecto no hay consentimiento', async () => {
    const { getConsentStatus, hasAnalyticsConsent } = await import('@/lib/consent');
    expect(getConsentStatus()).toBe('unset');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('guarda la aceptación y la expone como concedida', async () => {
    const { getConsentStatus, setConsentStatus, hasAnalyticsConsent } = await import('@/lib/consent');
    setConsentStatus('granted');
    expect(storage['meteo_analytics_consent']).toBe('granted');
    expect(getConsentStatus()).toBe('granted');
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('guarda el rechazo', async () => {
    const { getConsentStatus, setConsentStatus, hasAnalyticsConsent } = await import('@/lib/consent');
    setConsentStatus('denied');
    expect(getConsentStatus()).toBe('denied');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('emite un evento al cambiar el consentimiento', async () => {
    const { setConsentStatus, ANALYTICS_CONSENT_EVENT } = await import('@/lib/consent');
    setConsentStatus('granted');
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe(ANALYTICS_CONSENT_EVENT);
    expect(dispatched[0].detail).toEqual({ status: 'granted' });
  });

  it('volver a unset elimina el almacenamiento', async () => {
    const { getConsentStatus, setConsentStatus } = await import('@/lib/consent');
    setConsentStatus('granted');
    setConsentStatus('unset');
    expect(storage['meteo_analytics_consent']).toBeUndefined();
    expect(getConsentStatus()).toBe('unset');
  });
});
