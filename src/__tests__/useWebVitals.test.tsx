// @vitest-environment jsdom

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { reportCallbacks, mockBeacon, consentState } = vi.hoisted(() => ({
  reportCallbacks: {} as Record<string, (metric: unknown) => void>,
  mockBeacon: vi.fn<(url: string, data: Blob) => boolean>(() => true),
  consentState: { granted: false },
}));

vi.mock('web-vitals', () => ({
  onCLS: (cb: (metric: unknown) => void) => { reportCallbacks.CLS = cb; },
  onINP: (cb: (metric: unknown) => void) => { reportCallbacks.INP = cb; },
  onLCP: (cb: (metric: unknown) => void) => { reportCallbacks.LCP = cb; },
}));

vi.mock('@/lib/consent', () => ({
  hasAnalyticsConsent: () => consentState.granted,
}));

import { useWebVitals, flushPendingWebVitals } from '@/hooks/useWebVitals';

function sampleMetric(name: string, value: number) {
  return { name, value, delta: value, rating: 'good', id: `id-${name}`, navigationType: 'navigate', entries: [] };
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

function mount() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(<Harness />);
  });
}

function Harness() {
  useWebVitals();
  return null;
}

describe('useWebVitals (RUM propio)', () => {
  beforeEach(() => {
    consentState.granted = false;
    mockBeacon.mockClear();
    Object.defineProperty(navigator, 'sendBeacon', { value: mockBeacon, configurable: true, writable: true });
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', configurable: true });
    Object.defineProperty(window, 'location', { value: new URL('http://localhost/castril'), configurable: true, writable: true });
  });

  afterEach(() => {
    act(() => { root?.unmount(); });
    root = null;
    document.body.innerHTML = '';
    consentState.granted = true;
    flushPendingWebVitals();
    consentState.granted = false;
    mockBeacon.mockClear();
  });

  it('NO envía métricas sin consentimiento', () => {
    mount();
    act(() => { reportCallbacks.LCP(sampleMetric('LCP', 1200)); });
    expect(mockBeacon).not.toHaveBeenCalled();
  });

  it('envía las métricas acumuladas al conceder el consentimiento en la misma sesión', () => {
    mount();
    act(() => { reportCallbacks.LCP(sampleMetric('LCP', 1200)); });
    consentState.granted = true;
    flushPendingWebVitals();
    expect(mockBeacon).toHaveBeenCalledTimes(1);
    const body = mockBeacon.mock.calls[0][1] as Blob;
    expect(body).toBeInstanceOf(Blob);
  });

  it('envía directamente cuando ya hay consentimiento y no duplica al vaciar el búfer', () => {
    consentState.granted = true;
    mount();
    act(() => {
      reportCallbacks.LCP(sampleMetric('LCP', 2000));
      reportCallbacks.INP(sampleMetric('INP', 150));
      reportCallbacks.CLS(sampleMetric('CLS', 0.05));
    });
    expect(mockBeacon).toHaveBeenCalledTimes(3);
    flushPendingWebVitals();
    expect(mockBeacon).toHaveBeenCalledTimes(3);
  });
});
