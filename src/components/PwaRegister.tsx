'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'pwa-install-dismissed';
const SESSION_KEY = 'pwa-install-shown-this-session';
const VISIT_KEY = 'meteo_notifications_visits';
const NOTIFY_DISMISS_KEY = 'meteo_notifications_dismissed';
const NOTIFY_COOLDOWN_MS = 7 * 86400000;
const MODE_KEY = 'llano-pulse-mode';

type PulseMode = 'essential' | 'practical' | 'technical';

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mode, setMode] = useState<PulseMode>('essential');

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {});
    }

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

    const cleanup = () => window.removeEventListener('llano-pulse-mode-changed', syncMode as EventListener);

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { date } = JSON.parse(stored);
      const daysSince = (Date.now() - new Date(date).getTime()) / 86400000;
      if (daysSince < 7) {
        return cleanup;
      }
    }

    if (sessionStorage.getItem(SESSION_KEY)) return cleanup;

    let visits = 0;
    try {
      visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10);
    } catch {}
    if (visits < 2) return cleanup;

    const notifyRaw = localStorage.getItem(NOTIFY_DISMISS_KEY);
    const notificationWillShow =
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default' &&
      (!notifyRaw || Date.now() - JSON.parse(notifyRaw).ts >= NOTIFY_COOLDOWN_MS);
    if (notificationWillShow) return cleanup;

    return cleanup;
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      const promptEvent = e as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallEvent(promptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    if (!installEvent) return;
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 45000);
    return () => clearTimeout(timer);
  }, [installEvent]);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    setShowPrompt(false);
    setDismissed(true);
    if (choice.outcome === 'accepted') {
      try {
        await fetch('/api/pwa/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userAgent: navigator.userAgent }) });
      } catch {}
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: new Date().toISOString() }));
    } catch {}
  };

  if (mode === 'essential') return null;
  if (!showPrompt || dismissed) return null;

  return (
    <div className="mb-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <p className="text-sm font-bold text-slate-900">📲 Instala Meteo Huéscar</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        Acceso rápido a alertas, riego y previsión local desde tu pantalla de inicio.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleInstall}
          className="rounded-full bg-sky-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-800"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="rounded-full border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
