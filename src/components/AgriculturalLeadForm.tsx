'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { captureUtms } from '@/lib/utm';
import { leadFormSchema, fieldErrorsFromZod, LEAD_CROPS } from '@/lib/leadSchema';

const crops = [...LEAD_CROPS];
const interests = [
  'Avisos de helada',
  'Recomendaciones de riego',
  'Sensores para mi finca',
  'Diagnóstico agrícola',
  'Información sobre Terracía',
];

const WHATSAPP_URL =
  'https://wa.me/34614242716?text=Hola%20TecRural%2C%20vengo%20de%20Meteo%20Hu%C3%A9scar.%20Me%20interesa%20recibir%20informaci%C3%B3n%20sobre%20avisos%20agr%C3%ADcolas%20para%20mi%20finca.';

/** Campos cómodos en móvil: ≥44px de alto y 16px de letra (evita el zoom automático de iOS). */
const FIELD_CLASS =
  'mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500';
/** Checkbox 20px dentro de una fila táctil de ≥44px de alto. */
const CHECKBOX_CLASS = 'h-5 w-5 shrink-0 accent-emerald-700';

export function AgriculturalLeadForm() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  /** Resumen de lo enviado, para el estado de éxito (municipio, cultivo, intereses). */
  const [receipt, setReceipt] = useState<{ municipality: string; crop: string; interests: string[] } | null>(null);
  const track = useTrackEvent();
  /** Guard anti doble envío: ignorar submits mientras hay una petición en curso. */
  const sendingRef = useRef(false);
  /**
   * Clave de idempotencia del envío actual: se mantiene entre reintentos del
   * MISMO envío (red lenta, 429, 5xx) y se renueva tras éxito o corrección.
   * Así, pulsar varias veces o reintentar nunca crea leads duplicados.
   */
  const idempotencyKeyRef = useRef<string | null>(null);

  function nextIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return; // sin envíos duplicados
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const selectedInterests = interests.filter((interest) => form.getAll('interests').includes(interest));
    const rawPayload = {
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      municipality: String(form.get('municipality') ?? ''),
      crop: String(form.get('crop') ?? ''),
      area: String(form.get('area') ?? ''),
      interests: selectedInterests,
      serviceConsent: form.get('serviceConsent') === 'on',
      marketingConsent: form.get('marketingConsent') === 'on',
      website: String(form.get('website') ?? ''),
      source: 'meteo-huescar',
      landingPage: window.location.pathname,
      ...(() => {
        const utms = captureUtms();
        return {
          utmSource: utms.utm_source,
          utmMedium: utms.utm_medium,
          campaign: utms.utm_campaign,
        };
      })(),
    };

    // Validación en cliente con el MISMO esquema que aplica el servidor.
    const parsed = leadFormSchema.safeParse(rawPayload);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      setError('Revisa los campos marcados antes de enviar.');
      track('lead_form_error', { reason: 'validation', crop: rawPayload.crop, municipality: rawPayload.municipality });
      return;
    }

    // Envío real (datos válidos): intento de conversión.
    track('lead_form_submit', {
      municipality: parsed.data.municipality,
      crop: parsed.data.crop,
      interests: parsed.data.interests,
    });

    sendingRef.current = true;
    setSending(true);
    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = nextIdempotencyKey();
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKeyRef.current },
        body: JSON.stringify(rawPayload),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        duplicate?: boolean;
      };

      if (response.status === 201 || (response.ok && result.duplicate)) {
        // Guardado (o duplicado reciente tratado como éxito: no se vuelve a insertar).
        idempotencyKeyRef.current = null;
        // Resumen para el estado de éxito (datos ya validados por el esquema).
        setReceipt({
          municipality: parsed.data.municipality,
          crop: parsed.data.crop,
          interests: parsed.data.interests,
        });
        setSubmitted(true);
        setError(null);
        setFieldErrors({});
        track('lead_form_success', {
          municipality: parsed.data.municipality,
          crop: parsed.data.crop,
          interests: parsed.data.interests,
        });
        track('lead_form_submitted', { crop: rawPayload.crop, municipality: rawPayload.municipality });
        event.currentTarget.reset();
        return;
      }
      if (response.status === 400) {
        // Corrección del usuario = envío nuevo: clave nueva.
        idempotencyKeyRef.current = null;
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setError(result.error ?? 'Revisa los campos marcados antes de enviar.');
        track('lead_form_error', { reason: 'invalid_data', crop: parsed.data.crop, municipality: parsed.data.municipality });
        return;
      }
      if (response.status === 429) {
        setError(result.error ?? 'Has alcanzado el límite de solicitudes. Inténtalo más tarde.');
        track('lead_form_error', { reason: 'rate_limited', crop: parsed.data.crop, municipality: parsed.data.municipality });
        return;
      }
      setError(result.error ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
      track('lead_form_error', { reason: 'server', crop: parsed.data.crop, municipality: parsed.data.municipality });
    } catch {
      setError('Sin conexión. Comprueba tu red y vuelve a intentarlo.');
      track('lead_form_error', { reason: 'network', crop: rawPayload.crop, municipality: rawPayload.municipality });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-sm font-black text-emerald-950">¿Quieres recibir avisos para tu cultivo?</p>
      <p className="mt-1 text-xs leading-5 text-emerald-900/80">Te ayudamos a interpretar heladas, riego, calor y viento según tu finca.</p>
      {!open && !submitted && (
        <button
          type="button"
           onClick={() => { setOpen(true); track('lead_cta_click', { cta: 'Quiero avisos para mi finca', destination: 'inline-lead-form' }); track('lead_form_open'); }}
          className="mt-3 min-h-[44px] rounded-full bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
          >
          Quiero avisos para mi finca
        </button>
      )}
      {submitted && receipt && (
        <div className="mt-3 space-y-3" role="status">
          <div className="rounded-xl bg-white/80 p-3">
            <p className="text-sm font-black text-emerald-900">✅ Solicitud recibida</p>
            <ul className="mt-2 space-y-0.5 text-xs font-semibold text-emerald-900/90">
              <li>📍 Municipio: {receipt.municipality}</li>
              <li>🌱 Cultivo: {receipt.crop}</li>
              {receipt.interests.length > 0 && <li>🔎 Intereses: {receipt.interests.join(', ')}</li>}
            </ul>
            <p className="mt-2 text-xs leading-5 text-emerald-800">Te contactaremos normalmente en menos de 24 horas.</p>
          </div>
          <Link
            href="/huescar"
            className="flex items-center justify-center gap-2 rounded-full bg-sky-700 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-800"
          >
            ← Volver a la previsión
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('whatsapp_click', { context: 'lead-form-post-submit' })}
            className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
             Hablar con TecRural
          </a>
        </div>
      )}
      {open && !submitted && (
        <form onSubmit={handleSubmit} onChange={() => { if (!started) { setStarted(true); track('lead_form_start'); } }} className="mt-4 space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <label htmlFor="inline-name" className="text-xs font-semibold text-slate-700">
              Nombre <span className="font-normal text-slate-400">(opcional)</span>
              <input id="inline-name" name="name" autoComplete="name" maxLength={80} className={FIELD_CLASS} />
            </label>
            <label htmlFor="inline-phone" className="text-xs font-semibold text-slate-700">
              Teléfono / WhatsApp
              <input id="inline-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="done" required maxLength={30} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'inline-err-phone' : undefined} className={FIELD_CLASS} />
              {fieldErrors.phone && <p id="inline-err-phone" className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.phone}</p>}
            </label>
            <label htmlFor="inline-municipality" className="text-xs font-semibold text-slate-700">
              Municipio
              <input id="inline-municipality" name="municipality" autoComplete="address-level2" required maxLength={80} aria-invalid={Boolean(fieldErrors.municipality)} aria-describedby={fieldErrors.municipality ? 'inline-err-municipality' : undefined} className={FIELD_CLASS} />
              {fieldErrors.municipality && <p id="inline-err-municipality" className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.municipality}</p>}
            </label>
            <label htmlFor="inline-area" className="text-xs font-semibold text-slate-700">
              Superficie aproximada <span className="font-normal text-slate-400">(opcional)</span>
              <select id="inline-area" name="area" className={FIELD_CLASS}>
                <option value="">Selecciona</option>
                <option>Menos de 5 ha</option>
                <option>5-20 ha</option>
                <option>20-50 ha</option>
                <option>Más de 50 ha</option>
                <option>Prefiero no decirlo</option>
              </select>
            </label>
          </div>
          <label htmlFor="inline-crop" className="block text-xs font-semibold text-slate-700">
            Cultivo
            <select id="inline-crop" name="crop" required aria-invalid={Boolean(fieldErrors.crop)} aria-describedby={fieldErrors.crop ? 'inline-err-crop' : undefined} className={FIELD_CLASS}>
              <option value="">Selecciona</option>
              {crops.map((crop) => <option key={crop}>{crop}</option>)}
            </select>
            {fieldErrors.crop && <p id="inline-err-crop" className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.crop}</p>}
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700">¿Qué te interesa?</legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-2">
              {interests.map((interest) => (
                <label key={interest} className="flex min-h-[44px] items-center gap-2 rounded-lg px-1 text-xs text-slate-700 hover:bg-emerald-50">
                  <input type="checkbox" name="interests" value={interest} className={CHECKBOX_CLASS} />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
            {fieldErrors.interests && <p className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.interests}</p>}
          </fieldset>
          <div className="space-y-3 rounded-xl bg-white/70 p-3 text-xs text-slate-700">
            <div>
              <label className="flex min-h-[44px] items-center gap-2">
                <input type="checkbox" name="serviceConsent" required aria-invalid={Boolean(fieldErrors.serviceConsent)} className={CHECKBOX_CLASS} />
                <span>
                  <span className="mr-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">Obligatorio</span>
                  Acepto recibir los avisos solicitados para mi finca.
                </span>
              </label>
              <p className="ml-6 mt-0.5 text-[10px] leading-4 text-slate-500">
                Canales: WhatsApp y notificaciones push. Solo información meteorológica y agrícola solicitada; no incluye publicidad.
              </p>
            </div>
            {fieldErrors.serviceConsent && <p className="ml-6 text-[10px] font-semibold text-rose-600">{fieldErrors.serviceConsent}</p>}
            <div>
              <label className="flex min-h-[44px] items-center gap-2">
                <input type="checkbox" name="marketingConsent" className={CHECKBOX_CLASS} />
                <span>
                  <span className="mr-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600">Opcional</span>
                  Acepto recibir información comercial sobre sensores, diagnóstico, riego y otros servicios de TecRural.
                </span>
              </label>
              <p className="ml-6 mt-0.5 text-[10px] leading-4 text-slate-500">
                Canales: WhatsApp, email y notificaciones. Si no la marcas, seguirás recibiendo tus avisos con normalidad.
              </p>
            </div>
            <p className="leading-5 text-slate-500">Responsable: Manuel Carrasco García. Consulta la <Link className="font-semibold text-emerald-800 underline" href="/privacidad">política de privacidad</Link>. Puedes retirar cada consentimiento por separado en la <Link className="font-semibold text-emerald-800 underline" href="/privacidad#retirada-consentimiento">sección de retirada</Link> o escribiendo a <a className="font-semibold text-emerald-800 underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a>.</p>
          </div>
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          {error && (
            <div className="space-y-2">
              <p id="inline-form-error" role="alert" className="text-xs font-semibold text-rose-700">{error}</p>
              <p className="text-[10px] leading-4 text-slate-500">Tus datos siguen en el formulario: corrige o reintenta sin volver a escribirlos.</p>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => track('whatsapp_click', { context: 'lead-form-error' })}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                💬 También puedes escribirnos por WhatsApp
              </a>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="rounded-full bg-emerald-700 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{sending ? 'Enviando...' : error ? 'Reintentar' : 'Enviar solicitud'}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full min-h-[44px] px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-white">Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
