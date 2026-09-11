'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import {
  resolveAlertLifecycle,
  sanitizeDeliveryLog,
  WHATSAPP_CHANNEL_NOTE,
  type AlertLifecycle,
} from '@/lib/alertLifecycle';
import { ALERT_PREFS_KEY, type AlertPrefs } from '@/components/alerts/AlertOnboarding';

const LAST_ALERT_KEY = 'meteo_last_alert';
const PAUSED_KEY = 'meteo_alerts_paused';
const UNSUB_KEY = 'meteo_alerts_unsubscribed';
const DELIVERY_LOG_KEY = 'meteo_alert_delivery_log';

type LastAlert = { title: string; sentAt: string };

const STATE_TONE: Record<AlertLifecycle['state'], string> = {
  activo: 'bg-emerald-100 text-emerald-800',
  pendiente_permiso: 'bg-amber-100 text-amber-900',
  pausado: 'bg-slate-200 text-slate-700',
  error: 'bg-rose-100 text-rose-800',
  dado_de_baja: 'bg-slate-200 text-slate-700',
  no_soportado: 'bg-slate-200 text-slate-700',
};

export function AlertStatusPanel() {
  const [lifecycleInput, setLifecycleInput] = useState({
    browserSupport: true,
    permission: 'default' as NotificationPermission,
    subscribed: false,
    paused: false,
    unsubscribed: false,
    lastError: null as string | null,
  });
  const [lastAlert, setLastAlert] = useState<LastAlert | null>(null);
  const [deliveryLog, setDeliveryLog] = useState<Record<string, unknown> | null>(null);
  const [prefs, setPrefs] = useState<AlertPrefs | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const track = useTrackEvent();

  useEffect(() => {
    const browserSupport = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
    let permission: NotificationPermission = 'default';
    if (browserSupport) permission = Notification.permission;

    let paused = false;
    let unsubscribed = false;
    const timer = setTimeout(() => {
      try {
        paused = localStorage.getItem(PAUSED_KEY) === '1';
        unsubscribed = localStorage.getItem(UNSUB_KEY) === '1';
        const rawLast = localStorage.getItem(LAST_ALERT_KEY);
        if (rawLast) setLastAlert(JSON.parse(rawLast) as LastAlert);
        const rawLog = localStorage.getItem(DELIVERY_LOG_KEY);
        if (rawLog) setDeliveryLog(JSON.parse(rawLog) as Record<string, unknown>);
        const rawPrefs = localStorage.getItem(ALERT_PREFS_KEY);
        if (rawPrefs) setPrefs(JSON.parse(rawPrefs) as AlertPrefs);
      } catch {}
      setLifecycleInput((s) => ({ ...s, paused, unsubscribed }));
    }, 0);

    (async () => {
      let subscribed = false;
      if (browserSupport) {
        try {
          const reg = await navigator.serviceWorker.ready;
          subscribed = (await reg.pushManager.getSubscription()) !== null;
        } catch {}
      }
      setLifecycleInput((s) => ({ ...s, browserSupport, permission, subscribed }));
    })();

    return () => clearTimeout(timer);
  }, []);

  const lifecycle = resolveAlertLifecycle(lifecycleInput);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      let endpoint: string | undefined;
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          endpoint = (await reg.pushManager.getSubscription())?.endpoint;
        } catch {}
      }
      const res = await fetch('/api/push/test-self', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      const json = (await res.json()) as { sent?: number; error?: string };
      const now = new Date().toISOString();
      const entry = sanitizeDeliveryLog({
        channel: 'notificaciones',
        conditionKey: 'prueba:manual',
        ok: res.ok && (json.sent ?? 0) > 0,
        errorType: res.ok ? undefined : 'proveedor',
      });
      localStorage.setItem(DELIVERY_LOG_KEY, JSON.stringify(entry));
      setDeliveryLog(entry);
      if (res.ok && (json.sent ?? 0) > 0) {
        const alert: LastAlert = { title: 'Aviso de prueba', sentAt: now };
        localStorage.setItem(LAST_ALERT_KEY, JSON.stringify(alert));
        setLastAlert(alert);
        setMessage('Aviso de prueba enviado. Comprueba que ha llegado a este dispositivo.');
      } else {
        setMessage('El aviso de prueba no pudo entregarse. Si el permiso está bloqueado, revísalo en los ajustes del navegador.');
      }
    } catch {
      setMessage('Sin conexión con el servidor de avisos. Reintenta cuando tengas red.');
    } finally {
      setBusy(false);
    }
  }, []);

  const togglePause = useCallback(() => {
    const next = !lifecycleInput.paused;
    localStorage.setItem(PAUSED_KEY, next ? '1' : '0');
    setLifecycleInput((s) => ({ ...s, paused: next }));
    track(next ? 'alerts_paused' : 'alerts_resumed');
  }, [lifecycleInput.paused, track]);

  const unsubscribeAll = useCallback(async () => {
    setBusy(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          try {
            await fetch('/api/push/unsubscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint: sub.endpoint }),
            });
          } catch {}
          await sub.unsubscribe();
        }
      }
      localStorage.setItem(UNSUB_KEY, '1');
      localStorage.removeItem(PAUSED_KEY);
      setLifecycleInput((s) => ({ ...s, unsubscribed: true, subscribed: false, paused: false }));
      track('alerts_unsubscribed');
      setMessage('Te has dado de baja. No se enviarán más avisos a este dispositivo.');
    } finally {
      setBusy(false);
    }
  }, [track]);

  const reactivate = useCallback(() => {
    localStorage.removeItem(UNSUB_KEY);
    setLifecycleInput((s) => ({ ...s, unsubscribed: false }));
    setMessage('Baja anulada. Completa el asistente de activación para volver a recibir avisos.');
  }, []);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">⚙️ Estado de las alertas automáticas</p>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATE_TONE[lifecycle.state]}`}>
          {lifecycle.label}
        </span>
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-600">{lifecycle.description}</p>
      {lifecycle.actionable && <p className="mt-0.5 text-xs font-semibold text-sky-800">{lifecycle.actionable}</p>}

      {prefs && (
        <p className="mt-2 text-[11px] leading-4 text-slate-500">
          Configuración: {prefs.variables.join(', ') || 'sin variables'} · silencio {prefs.quietStart}:00–{prefs.quietEnd}:00 · canal {prefs.channel}.
        </p>
      )}

      {lastAlert && (
        <p className="mt-2 text-[11px] text-slate-500">
          Último aviso: <span className="font-semibold text-slate-700">{lastAlert.title}</span> · {new Date(lastAlert.sentAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
      )}
      {deliveryLog && !deliveryLog.ok && (
        <p className="mt-1 text-[11px] text-rose-700">Último envío con fallo ({String(deliveryLog.errorType)}). Revisa el permiso o la conexión.</p>
      )}

      {message && <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{message}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !lifecycleInput.subscribed}
          onClick={sendTest}
          className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          Enviar aviso de prueba
        </button>
        {lifecycle.state === 'dado_de_baja' ? (
          <button type="button" onClick={reactivate} className="rounded-full border border-sky-300 px-4 py-2 text-xs font-bold text-sky-800">
            Reactivar
          </button>
        ) : (
          <>
            <button type="button" onClick={togglePause} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">
              {lifecycleInput.paused ? 'Reactivar' : 'Pausar'}
            </button>
            <button type="button" disabled={busy} onClick={unsubscribeAll} className="rounded-full px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40">
              Darme de baja
            </button>
          </>
        )}
      </div>

      <details className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-4 text-slate-500">
        <summary className="cursor-pointer font-bold text-slate-600">¿Y WhatsApp?</summary>
        <p className="mt-1">{WHATSAPP_CHANNEL_NOTE}</p>
      </details>
    </div>
  );
}
