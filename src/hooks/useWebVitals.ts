'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { hasAnalyticsConsent } from '@/lib/consent';
import { getMunicipality } from '@/config/municipalities';

const SEND_BEACON_URL = '/api/events';
const MAX_BUFFERED_METRICS = 12;

/**
 * Métricas capturadas ANTES de que el usuario otorgue su consentimiento.
 * No se envían hasta que haya autorización; si la concede en la misma sesión,
 * se envían en ese momento (sin perder las métricas ya medidas).
 */
const bufferedMetrics: Metric[] = [];

function getDeviceType(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|Android.*Mobile|Windows Phone/i.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'unknown';
}

function getConnectionType(): string | undefined {
  if (typeof navigator === 'undefined') return undefined;
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
  if (!conn) return undefined;
  return conn.effectiveType ?? conn.type;
}

function getMunicipalityFromPath(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  const candidate = segments[0];
  if (candidate && getMunicipality(candidate)) return candidate;
  return undefined;
}

function readUtmCampaign(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  try {
    return JSON.parse(sessionStorage.getItem('meteo_utms') || '{}').utm_campaign;
  } catch {
    return undefined;
  }
}

function readEntryPage(): string | undefined {
  if (typeof sessionStorage === 'undefined') return undefined;
  return sessionStorage.getItem('meteo_entry_page') ?? undefined;
}

function buildPayload(metric: Metric): Record<string, unknown> {
  return {
    event: `web_vital_${metric.name.toLowerCase()}`,
    page: typeof window !== 'undefined' ? window.location.pathname : undefined,
    entryPage: readEntryPage(),
    utmCampaign: readUtmCampaign(),
    metadata: {
      value: metric.value,
      delta: metric.delta,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      route: typeof window !== 'undefined' ? window.location.pathname : undefined,
      municipality: typeof window !== 'undefined' ? getMunicipalityFromPath(window.location.pathname) : undefined,
      device_type: getDeviceType(),
      connection_type: getConnectionType(),
    },
  };
}

function transmit(metric: Metric): void {
  const payload = JSON.stringify(buildPayload(metric));
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(SEND_BEACON_URL, new Blob([payload], { type: 'application/json' }));
      return;
    }
  } catch {}
  fetch(SEND_BEACON_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/**
 * Registra una métrica: si hay consentimiento se envía de inmediato; si no,
 * queda en memoria a la espera de autorización.
 */
function reportMetric(metric: Metric): void {
  if (hasAnalyticsConsent()) {
    transmit(metric);
    return;
  }
  if (bufferedMetrics.length >= MAX_BUFFERED_METRICS) bufferedMetrics.shift();
  bufferedMetrics.push(metric);
}

/**
 * Envía las métricas acumuladas tras otorgar el consentimiento. Las que ya se
 * habían enviado previamente no se duplican porque la lista se vacía al usar.
 */
export function flushPendingWebVitals(): void {
  if (!hasAnalyticsConsent()) return;
  while (bufferedMetrics.length > 0) {
    const metric = bufferedMetrics.shift();
    if (metric) transmit(metric);
  }
}

export function useWebVitals() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onConsentChanged = (): void => flushPendingWebVitals();
    window.addEventListener('meteo:analytics-consent', onConsentChanged);

    const opts = { reportAllChanges: false };
    onCLS(reportMetric, opts);
    onINP(reportMetric, opts);
    onLCP(reportMetric, opts);

    return () => window.removeEventListener('meteo:analytics-consent', onConsentChanged);
  }, []);
}
