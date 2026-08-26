'use client';

import { useCallback, useRef } from 'react';

const sentEvents = new Map<string, number>();
const DEDUP_WINDOW_MS = 60_000;

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

    const payload = JSON.stringify({ event, page, metadata });

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
