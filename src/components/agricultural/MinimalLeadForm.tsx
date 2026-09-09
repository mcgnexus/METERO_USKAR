'use client';

import { FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { captureUtms } from '@/lib/utm';
import { leadFormSchema, fieldErrorsFromZod, LEAD_CROPS } from '@/lib/leadSchema';

const crops = [...LEAD_CROPS];
const step2Interests = [
  'Avisos de helada',
  'Recomendaciones de riego',
  'Sensores para mi finca',
  'Diagnóstico agrícola',
  'Información sobre Terracía',
];

const FIELD_CLASS =
  'mt-1 w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base font-normal outline-none focus:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-500';
const CHECKBOX_CLASS = 'h-5 w-5 shrink-0 accent-emerald-700';

/**
 * Variante B del experimento de captación: formulario mínimo.
 * Paso 1 (obligatorio): teléfono, municipio y cultivo + consentimiento del servicio.
 * Paso 2 (opcional): superficie e intereses, ocultos por defecto para reducir fricción.
 * Mide inicio (lead_form_start), abandono y lead válido con la variante en metadata.
 */
export function MinimalLeadForm() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [showStep2, setShowStep2] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<{ municipality: string; crop: string } | null>(null);
  const track = useTrackEvent();
  const sendingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  function nextIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    setError(null);
    setFieldErrors({});

    const form = new FormData(event.currentTarget);
    const selectedInterests = step2Interests.filter((interest) => form.getAll('interests').includes(interest));
    const rawPayload = {
      phone: String(form.get('phone') ?? ''),
      municipality: String(form.get('municipality') ?? ''),
      crop: String(form.get('crop') ?? ''),
      area: String(form.get('area') ?? ''),
      interests: selectedInterests,
      serviceConsent: form.get('serviceConsent') === 'on',
      marketingConsent: form.get('marketingConsent') === 'on',
      abVariant: 'B',
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

    const parsed = leadFormSchema.safeParse(rawPayload);
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFromZod(parsed.error));
      setError('Revisa los campos marcados antes de enviar.');
      track('lead_form_error', { variant: 'B', reason: 'validation', crop: rawPayload.crop, municipality: rawPayload.municipality });
      return;
    }

    track('lead_form_submit', { variant: 'B', municipality: parsed.data.municipality, crop: parsed.data.crop });

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
        idempotencyKeyRef.current = null;
        setReceipt({ municipality: parsed.data.municipality, crop: parsed.data.crop });
        setSubmitted(true);
        setError(null);
        setFieldErrors({});
        track('lead_form_success', { variant: 'B', municipality: parsed.data.municipality, crop: parsed.data.crop });
        event.currentTarget.reset();
        return;
      }
      if (response.status === 400) {
        idempotencyKeyRef.current = null;
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        setError(result.error ?? 'Revisa los campos marcados antes de enviar.');
        track('lead_form_error', { variant: 'B', reason: 'invalid_data', crop: parsed.data.crop, municipality: parsed.data.municipality });
        return;
      }
      if (response.status === 429) {
        setError(result.error ?? 'Has alcanzado el límite de solicitudes. Inténtalo más tarde.');
        track('lead_form_error', { variant: 'B', reason: 'rate_limited', crop: parsed.data.crop, municipality: parsed.data.municipality });
        return;
      }
      setError(result.error ?? 'No se pudo enviar la solicitud. Inténtalo de nuevo.');
      track('lead_form_error', { variant: 'B', reason: 'server', crop: parsed.data.crop, municipality: parsed.data.municipality });
    } catch {
      setError('Sin conexión. Comprueba tu red y vuelve a intentarlo.');
      track('lead_form_error', { variant: 'B', reason: 'network', crop: rawPayload.crop, municipality: rawPayload.municipality });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  return (
    <section className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-sm font-black text-emerald-950">¿Quieres recibir avisos para tu cultivo?</p>
      <p className="mt-1 text-xs leading-5 text-emerald-900/80">Solo 3 datos y te ayudamos con heladas, riego y viento para tu finca.</p>
      {!open && !submitted && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            track('lead_cta_click', { variant: 'B', cta: 'Quiero avisos para mi finca', destination: 'minimal-form' });
            track('lead_form_open', { variant: 'B' });
          }}
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
            </ul>
            <p className="mt-2 text-xs leading-5 text-emerald-800">Te contactaremos normalmente en menos de 24 horas.</p>
          </div>
          <Link
            href="/huescar"
            className="flex items-center justify-center gap-2 rounded-full bg-sky-700 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-sky-800"
          >
            ← Volver a la previsión
          </Link>
        </div>
      )}

      {open && !submitted && (
        <form onSubmit={handleSubmit} onChange={() => { if (!started) { setStarted(true); track('lead_form_start', { variant: 'B' }); } }} className="mt-4 space-y-3" noValidate>
          <label htmlFor="min-phone" className="block text-xs font-semibold text-slate-700">
            Teléfono / WhatsApp
            <input id="min-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" enterKeyHint="done" required maxLength={30} aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? 'min-err-phone' : undefined} className={FIELD_CLASS} />
            {fieldErrors.phone && <p id="min-err-phone" className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.phone}</p>}
          </label>
          <label htmlFor="min-municipality" className="block text-xs font-semibold text-slate-700">
            Municipio
            <input id="min-municipality" name="municipality" autoComplete="address-level2" required maxLength={80} aria-invalid={Boolean(fieldErrors.municipality)} aria-describedby={fieldErrors.municipality ? 'min-err-municipality' : undefined} className={FIELD_CLASS} />
            {fieldErrors.municipality && <p id="min-err-municipality" className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.municipality}</p>}
          </label>
          <label htmlFor="min-crop" className="block text-xs font-semibold text-slate-700">
            Cultivo
            <select id="min-crop" name="crop" required aria-invalid={Boolean(fieldErrors.crop)} aria-describedby={fieldErrors.crop ? 'min-err-crop' : undefined} className={FIELD_CLASS}>
              <option value="">Selecciona</option>
              {crops.map((crop) => <option key={crop}>{crop}</option>)}
            </select>
            {fieldErrors.crop && <p id="min-err-crop" className="mt-0.5 text-[10px] font-semibold text-rose-600">{fieldErrors.crop}</p>}
          </label>

          <details
            open={showStep2}
            onToggle={(event) => setShowStep2((event.currentTarget as HTMLDetailsElement).open)}
            className="rounded-xl bg-white/60 p-3"
          >
            <summary className="cursor-pointer text-xs font-bold text-emerald-900">
              Paso 2 (opcional) · Superficie e intereses
            </summary>
            <div className="mt-3 space-y-3">
              <label htmlFor="min-area" className="block text-xs font-semibold text-slate-700">
                Superficie aproximada <span className="font-normal text-slate-400">(opcional)</span>
                <select id="min-area" name="area" className={FIELD_CLASS}>
                  <option value="">Selecciona</option>
                  <option>Menos de 5 ha</option>
                  <option>5-20 ha</option>
                  <option>20-50 ha</option>
                  <option>Más de 50 ha</option>
                  <option>Prefiero no decirlo</option>
                </select>
              </label>
              <fieldset>
                <legend className="text-xs font-semibold text-slate-700">¿Qué te interesa?</legend>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {step2Interests.map((interest) => (
                    <label key={interest} className="flex min-h-[44px] items-center gap-2 rounded-lg px-1 text-xs text-slate-700 hover:bg-emerald-50">
                      <input type="checkbox" name="interests" value={interest} className={CHECKBOX_CLASS} />
                      <span>{interest}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex min-h-[44px] items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" name="marketingConsent" className={CHECKBOX_CLASS} />
                <span>
                  <span className="mr-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600">Opcional</span>
                  Acepto recibir información comercial sobre servicios de TecRural.
                </span>
              </label>
            </div>
          </details>

          <label className="flex min-h-[44px] items-center gap-2 text-xs text-slate-700">
            <input type="checkbox" name="serviceConsent" required aria-invalid={Boolean(fieldErrors.serviceConsent)} className={CHECKBOX_CLASS} />
            <span>
              <span className="mr-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-black text-emerald-800">Obligatorio</span>
              Acepto recibir los avisos solicitados para mi finca.
            </span>
          </label>
          {fieldErrors.serviceConsent && <p className="text-[10px] font-semibold text-rose-600">{fieldErrors.serviceConsent}</p>}
          <p className="text-[10px] leading-4 text-slate-500">
            Responsable: Manuel Carrasco García. Consulta la <Link className="font-semibold text-emerald-800 underline" href="/privacidad">política de privacidad</Link>.
          </p>

          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          {error && <p id="min-form-error" role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="rounded-full bg-emerald-700 min-h-[44px] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
              {sending ? 'Enviando...' : error ? 'Reintentar' : 'Enviar solicitud'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full min-h-[44px] px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-white">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}