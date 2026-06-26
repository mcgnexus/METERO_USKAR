'use client';

import { useState, useCallback, useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}

const LS_KEY = 'meteo_notifications_dismissed';
const VISIT_KEY = 'meteo_notifications_visits';
const MODE_KEY = 'llano-pulse-mode';

type PulseMode = 'essential' | 'practical' | 'technical';

export function NotificationPermission() {
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<NotificationPermission | 'loading' | 'done'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [visits, setVisits] = useState(0);
  const [mode, setMode] = useState<PulseMode>('essential');

  useEffect(() => {
    setMounted(true);
    const syncMode = () => {
      const rawMode = localStorage.getItem(MODE_KEY);
      if (rawMode === 'technical' || rawMode === 'practical' || rawMode === 'essential') {
        setMode(rawMode);
      } else if (rawMode === 'simple') {
        setMode('essential');
      }
    };
    syncMode();
    window.addEventListener('llano-pulse-mode-changed', syncMode as EventListener);

    const nextStatus: NotificationPermission | 'loading' =
      typeof window !== 'undefined' && 'Notification' in window
        ? Notification.permission
        : 'loading';
    setStatus(nextStatus);

    let visitCount = 0;
    try {
      visitCount = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
    } catch {}
    localStorage.setItem(VISIT_KEY, String(visitCount + 1));
    setVisits(visitCount + 1);

    let nextDismissed = true;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        nextDismissed = false;
      } else {
        nextDismissed = Date.now() - JSON.parse(raw).ts < 7 * 86400000;
      }
    } catch {
      nextDismissed = false;
    }
    setDismissed(nextDismissed);

    return () => window.removeEventListener('llano-pulse-mode-changed', syncMode as EventListener);
  }, []);

  if (visits > 0 && visits < 2) return null;
  if (mode === 'essential') return null;

  const handleEnable = useCallback(async () => {
    setError(null);
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

      const permission = await Notification.requestPermission();
      setStatus(permission);
      if (permission !== 'granted') return;

      const reg = await navigator.serviceWorker.ready;

      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        const res = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await res.json();
        if (!publicKey) throw new Error('VAPID no disponible');

        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subJson = subscription.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subJson),
      });

      setStatus('done');
    } catch {
      setError('No se pudieron activar las notificaciones');
    }
  }, []);

  if (!mounted) return null;

  if (status === 'granted' || status === 'done') {
    return null;
  }

  if (dismissed) return null;

  if (status === 'denied') {
    return null;
  }

  return (
    <div className="rounded-[20px] border border-sky-200 bg-sky-50/90 p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">🔔</span>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">Activa las alertas</p>
          <p className="mt-0.5 text-xs leading-4 text-slate-600">
            Recibe avisos de heladas, calor extremo, viento y tormentas en tu movil.
          </p>
          {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={handleEnable}
              className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-800"
            >
              Activar
            </button>
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                localStorage.setItem(LS_KEY, JSON.stringify({ ts: Date.now() }));
              }}
              className="rounded-full px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
