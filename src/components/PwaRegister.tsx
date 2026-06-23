'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const STORAGE_KEY = 'pwa-install-dismissed';

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(() => {});
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const { date } = JSON.parse(stored);
      const daysSince = (Date.now() - new Date(date).getTime()) / 86400000;
      if (daysSince < 7) {
        return;
      }
    }
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
    }, 15000);
    return () => clearTimeout(timer);
  }, [installEvent]);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
    setShowPrompt(false);
    setDismissed(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: new Date().toISOString() }));
    } catch {}
  };

  if (!showPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-slide-down rounded-2xl border border-sky-100 bg-white p-4 shadow-2xl">
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
