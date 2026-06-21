'use client';

import { useEffect, useState } from 'react';

export default function PwaRegister() {
  const [installEvent, setInstallEvent] = useState<Event | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registrado:', reg.scope))
        .catch((err) => console.warn('SW no se pudo registrar:', err));
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    (installEvent as any).prompt();
    const result = await (installEvent as any).userChoice;
    if (result.outcome === 'accepted') setInstallEvent(null);
    setDismissed(true);
  };

  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <p className="text-sm font-bold text-slate-900">Instala Meteo Huéscar</p>
      <p className="mt-1 text-xs text-slate-600">Añade esta web a tu pantalla de inicio para acceso rápido.</p>
      <div className="mt-3 flex gap-2">
        <button onClick={handleInstall} className="rounded-full bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700">Instalar</button>
        <button onClick={() => setDismissed(true)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Ahora no</button>
      </div>
    </div>
  );
}
