'use client';

import { useState } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { WHATSAPP_CHANNEL_NOTE, type AlertChannel } from '@/lib/alertLifecycle';

export const ALERT_PREFS_KEY = 'meteo_alert_prefs';

export type AlertPrefs = {
  crop: string;
  areaM2: string;
  variables: string[];
  thresholds: Record<string, string>;
  channel: AlertChannel;
  quietStart: number;
  quietEnd: number;
};

export function defaultAlertPrefs(): AlertPrefs {
  return {
    crop: '',
    areaM2: '',
    variables: ['helada'],
    thresholds: { helada: '2', calor: '35', viento: '60', lluvia: '20' },
    channel: 'notificaciones',
    quietStart: 22,
    quietEnd: 7,
  };
}

const VARIABLES = [
  { key: 'helada', label: 'Helada (mínima prevista)' },
  { key: 'calor', label: 'Calor extremo (máxima prevista)' },
  { key: 'viento', label: 'Viento (ráfagas)' },
  { key: 'lluvia', label: 'Lluvia significativa' },
];

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const rawData = window.atob(base64String.replace(/-/g, '+').replace(/_/g, '/'));
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}

const STEPS = ['Parcela', 'Variables', 'Umbrales', 'Canal', 'Horario', 'Confirmar'];

export function AlertOnboarding({ onDone }: { onDone?: () => void }) {
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<AlertPrefs>(defaultAlertPrefs);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const track = useTrackEvent();

  const update = (patch: Partial<AlertPrefs>) => setPrefs((p) => ({ ...p, ...patch }));
  const toggleVariable = (key: string) =>
    setPrefs((p) => ({
      ...p,
      variables: p.variables.includes(key) ? p.variables.filter((v) => v !== key) : [...p.variables, key],
    }));

  const finish = async () => {
    setError(null);
    try {
      localStorage.setItem(ALERT_PREFS_KEY, JSON.stringify(prefs));

      if (prefs.channel === 'whatsapp') {
        track('alert_onboarding_whatsapp');
        setStep(STEPS.length);
        return;
      }

      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setError('Este navegador no soporta notificaciones. Puedes usar WhatsApp como alternativa.');
        return;
      }

      setBusy(true);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('Permiso no concedido. Puedes reintentarlo o elegir WhatsApp como alternativa.');
        setBusy(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        const res = await fetch('/api/push/vapid-public-key');
        const { publicKey } = await res.json();
        if (!publicKey) throw new Error('sin clave VAPID');
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      track('alert_onboarding_completed');
      setStep(STEPS.length);
    } catch (e) {
      setError(e instanceof Error ? `No se pudo activar: ${e.message}. Reintenta o usa WhatsApp.` : 'No se pudo activar. Reintenta.');
    } finally {
      setBusy(false);
    }
  };

  if (step > STEPS.length - 1) {
    return (
      <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/90 p-4 text-sm">
        <p className="font-bold text-emerald-900">✅ Configuración guardada</p>
        {prefs.channel === 'whatsapp' ? (
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            Has elegido WhatsApp: es atención personalizada gestionada por una persona, no el sistema automático. Te pondrás en contacto desde la sección de contacto.
          </p>
        ) : (
          <p className="mt-1 text-xs leading-5 text-emerald-900">
            Recibirás avisos automáticos de: {prefs.variables.join(', ') || 'ninguna variable'} con tus umbrales. Envía un aviso de prueba desde el panel de estado para comprobarlo.
          </p>
        )}
        {onDone && (
          <button type="button" onClick={onDone} className="mt-2 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
            Cerrar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-sky-200 bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">🔔 Configurar alertas · paso {step + 1} de {STEPS.length}</p>
      <div className="mt-1 flex gap-1">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-sky-600' : 'bg-slate-200'}`} title={s} />
        ))}
      </div>

      {step === 0 && (
        <div className="mt-3 space-y-2 text-sm">
          <label className="block text-xs font-semibold text-slate-700">
            Cultivo
            <input value={prefs.crop} onChange={(e) => update({ crop: e.target.value })} placeholder="olivo, almendro…" className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Superficie aproximada (m²), opcional
            <input type="number" min="0" value={prefs.areaM2} onChange={(e) => update({ areaM2: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5" />
          </label>
        </div>
      )}

      {step === 1 && (
        <fieldset className="mt-3 space-y-1.5 text-sm">
          <legend className="text-xs font-semibold text-slate-700">¿Qué quieres vigilar?</legend>
          {VARIABLES.map((v) => (
            <label key={v.key} className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={prefs.variables.includes(v.key)} onChange={() => toggleVariable(v.key)} />
              {v.label}
            </label>
          ))}
        </fieldset>
      )}

      {step === 2 && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-slate-600">Umbrales que disparan el aviso (puedes cambiarlos después):</p>
          {prefs.variables.includes('helada') && (
            <label className="block text-xs font-semibold text-slate-700">Helada si mínima &lt; (°C)
              <input type="number" value={prefs.thresholds.helada} onChange={(e) => update({ thresholds: { ...prefs.thresholds, helada: e.target.value } })} className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5" />
            </label>
          )}
          {prefs.variables.includes('calor') && (
            <label className="block text-xs font-semibold text-slate-700">Calor si máxima &gt; (°C)
              <input type="number" value={prefs.thresholds.calor} onChange={(e) => update({ thresholds: { ...prefs.thresholds, calor: e.target.value } })} className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5" />
            </label>
          )}
          {prefs.variables.includes('viento') && (
            <label className="block text-xs font-semibold text-slate-700">Viento si ráfagas &gt; (km/h)
              <input type="number" value={prefs.thresholds.viento} onChange={(e) => update({ thresholds: { ...prefs.thresholds, viento: e.target.value } })} className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5" />
            </label>
          )}
          {prefs.variables.includes('lluvia') && (
            <label className="block text-xs font-semibold text-slate-700">Lluvia si acumulado &gt; (mm/24 h)
              <input type="number" value={prefs.thresholds.lluvia} onChange={(e) => update({ thresholds: { ...prefs.thresholds, lluvia: e.target.value } })} className="mt-1 w-24 rounded-lg border border-slate-200 px-2 py-1.5" />
            </label>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs font-semibold text-slate-700">Canal de aviso</p>
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input type="radio" checked={prefs.channel === 'notificaciones'} onChange={() => update({ channel: 'notificaciones' })} />
            <span><span className="font-semibold">Notificaciones automáticas del navegador.</span> Avisos generados por el modelo sin intervención humana, solo cuando se cumple un umbral y como máximo un resumen al día.</span>
          </label>
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input type="radio" checked={prefs.channel === 'whatsapp'} onChange={() => update({ channel: 'whatsapp' })} />
            <span><span className="font-semibold">WhatsApp (TecRural).</span> Atención personalizada por una persona: umbrales a medida, sensores en campo. No es automático ni comparte configuración con las notificaciones.</span>
          </label>
          <p className="rounded-xl bg-slate-50 p-2 text-[11px] leading-4 text-slate-500">{WHATSAPP_CHANNEL_NOTE}</p>
        </div>
      )}

      {step === 4 && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs text-slate-600">Franja de silencio: no te molestamos entre estas horas (los avisos críticos de helada activa sí se envían):</p>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <label>Desde
              <select value={prefs.quietStart} onChange={(e) => update({ quietStart: Number(e.target.value) })} className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </label>
            <label>Hasta
              <select value={prefs.quietEnd} onChange={(e) => update({ quietEnd: Number(e.target.value) })} className="ml-1 rounded-lg border border-slate-200 px-2 py-1.5">
                {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{h}:00</option>)}
              </select>
            </label>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-xs font-semibold text-slate-700">Resumen y confirmación</p>
          <ul className="space-y-0.5 text-xs leading-5 text-slate-600">
            <li>· Parcela: {prefs.crop || 'sin especificar'}{prefs.areaM2 ? ` · ${prefs.areaM2} m²` : ''}</li>
            <li>· Variables: {prefs.variables.join(', ') || 'ninguna'}</li>
            <li>· Umbrales: {prefs.variables.map((v) => `${v}=${prefs.thresholds[v] ?? '—'}`).join(' · ')}</li>
            <li>· Canal: {prefs.channel === 'whatsapp' ? 'WhatsApp (personalizado, no automático)' : 'notificaciones del navegador'}</li>
            <li>· Silencio: {prefs.quietStart}:00–{prefs.quietEnd}:00</li>
            <li>· Recibirás: avisos solo cuando se cumpla un umbral nuevo, como máximo 1 por condición y hora y un resumen diario. Sin coste. Puedes pausar o darte de baja cuando quieras sin asistencia.</li>
          </ul>
          {prefs.channel === 'notificaciones' && (
            <p className="text-xs text-slate-600">
              Al confirmar, el navegador te pedirá permiso para notificaciones. Es el único momento en que lo solicitamos.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        {step > 0 && (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="rounded-full px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">
            Atrás
          </button>
        )}
        <span className="flex-1" />
        {step < STEPS.length - 1 ? (
          <button type="button" onClick={() => setStep((s) => s + 1)} className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white">
            Siguiente
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={finish} className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
            {busy ? 'Activando…' : prefs.channel === 'whatsapp' ? 'Confirmar WhatsApp' : 'Confirmar y pedir permiso'}
          </button>
        )}
      </div>
    </div>
  );
}
