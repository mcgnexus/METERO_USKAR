'use client';

import { useCallback, useRef } from 'react';
import { captureUtms } from '@/lib/utm';

const sentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;
const ENTRY_PAGE_KEY = 'meteo_entry_page';

/** Página de ENTRADA de la sesión (se fija en la primera vista, no cambia al navegar). */
function entryPage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = sessionStorage.getItem(ENTRY_PAGE_KEY);
    if (stored) return stored;
    const current = window.location.pathname;
    sessionStorage.setItem(ENTRY_PAGE_KEY, current);
    return current;
  } catch {
    return window.location.pathname;
  }
}

export function useTrackEvent() {
  const pendingRef = useRef<Set<string>>(new Set());

  const track = useCallback((event: string, metadata?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const lastSent = sentEvents.get(event);
    if (lastSent && now - lastSent < DEDUP_WINDOW_MS) return;

    const key = `${event}:${JSON.stringify(metadata ?? {})}`;
    if (pendingRef.current.has(key)) return;
    pendingRef.current.add(key);

    const page = window.location.pathname;
    // Dimensiones de conversión: página de entrada y campaña UTM de la sesión.
    const utmCampaign = captureUtms().utm_campaign;
    const payload = JSON.stringify({
      event,
      page,
      entryPage: entryPage(),
      utmCampaign,
      metadata,
    });

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/events', new Blob([payload], { type: 'application/json' }));
        sentEvents.set(event, now);
        pendingRef.current.delete(key);
        return;
      }
    } catch {}

    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).then(() => {
      sentEvents.set(event, now);
    }).catch(() => {}).finally(() => {
      pendingRef.current.delete(key);
    });
  }, []);

  return track;
}
