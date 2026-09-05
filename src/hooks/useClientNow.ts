'use client';

import { useEffect, useState } from 'react';

/**
 * Returns the current time only after the component has mounted on the client.
 * Returns null during SSR and the first client render so that server-rendered
 * HTML and the hydration snapshot are always identical. Use this instead of
 * `new Date()` / `Date.now()` anywhere that affects rendered output.
 *
 * When `reference` is provided, the first client value is derived from it so
 * that the pre-mount render matches the server output (both use the stable
 * reference), then it switches to the real clock once mounted.
 */
export function useClientNow(reference?: number | string | null): number | null {
  const [now, setNow] = useState<number | null>(() => {
    if (reference === undefined || reference === null || reference === '') return null;
    const ts = typeof reference === 'number' ? reference : new Date(String(reference)).getTime();
    return Number.isFinite(ts) ? ts : null;
  });

  useEffect(() => {
    const t = Date.now();
    // First mount: if we already derived from a reference, advance it slightly
    // is unnecessary; use the real clock so the filter is accurate going forward.
    setNow((prev) => (prev === null ? t : Math.max(prev, t)));
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return now;
}
