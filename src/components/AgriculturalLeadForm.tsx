'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { captureUtms } from '@/lib/utm';

const crops = ['Olivar', 'Almendro', 'Pistacho', 'Hortícola', 'Otro'];
const interests = [
  'Avisos de helada',
  'Recomendaciones de riego',
  'Sensores para mi finca',
  'Diagnóstico agrícola',
  'Información sobre Terracía',
];

export function AgriculturalLeadForm() {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const track = useTrackEvent();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);

    const form = new FormData(event.currentTarget);
    const selectedInterests = interests.filter((interest) => form.getAll('interests').includes(interest));
    const payload = {
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      municipality: String(form.get('municipality') ?? ''),
      crop: String(form.get('crop') ?? ''),
      area: String(form.get('area') ?? ''),
      interests: selectedInterests,
      meteorologicalConsent: form.get('meteorologicalConsent') === 'on',
      commercialConsent: form.get('commercialConsent') === 'on',
      website: String(form.get('website') ?? ''),
      source: 'meteo-huescar',
      landingPage: window.location.pathname,
      ...(() => {
        const utms = captureUtms();
        return {
          utmSource: utms.utm_source,
          utmMedium: utms.utm_medium,
          utmCampaign: utms.utm_campaign,
        };
      })(),
    };

    try {
      const response = await fetch('/api/leads/agricultural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'No se pudo enviar la solicitud.');
      setSubmitted(true);
      track('lead_form_submitted', { crop: payload.crop, municipality: payload.municipality });
      event.currentTarget.reset();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar la solicitud.');
    } finally {
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
          onClick={() => { setOpen(true); track('lead_form_opened'); }}
          className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-800"
        >
          Quiero avisos para mi finca
        </button>
      )}
      {submitted && (
        <div className="mt-3 space-y-3">
          <p className="rounded-xl bg-white/70 p-3 text-xs font-semibold text-emerald-900">
            Solicitud recibida. Te contactaremos para conocer mejor tu finca.
          </p>
          <a
            href="https://wa.me/34614242716?text=Hola%20TecRural%2C%20vengo%20de%20Meteo%20Hu%C3%A9scar.%20Me%20interesa%20recibir%20informaci%C3%B3n%20sobre%20avisos%20agr%C3%ADcolas%20para%20mi%20finca."
            target="_blank"
            rel="noreferrer"
            onClick={() => track('whatsapp_clicked', { context: 'lead-form-post-submit' })}
            className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            💬 Hablar ahora con TecRural
          </a>
        </div>
      )}
      {open && !submitted && (
        <form onSubmit={handleSubmit} onChange={() => { if (!started) { setStarted(true); track('lead_form_started'); } }} className="mt-4 space-y-3" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700">
              Nombre
              <input name="name" required maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Teléfono / WhatsApp
              <input name="phone" required maxLength={30} inputMode="tel" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Municipio
              <input name="municipality" required maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600" />
            </label>
            <label className="text-xs font-semibold text-slate-700">
              Superficie aproximada
              <select name="area" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600">
                <option value="">Selecciona</option>
                <option>Menos de 5 ha</option>
                <option>5-20 ha</option>
                <option>20-50 ha</option>
                <option>Más de 50 ha</option>
                <option>Prefiero no decirlo</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-slate-700">
            Cultivo
            <select name="crop" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-emerald-600">
              <option value="">Selecciona</option>
              {crops.map((crop) => <option key={crop}>{crop}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="text-xs font-semibold text-slate-700">¿Qué te interesa?</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {interests.map((interest) => (
                <label key={interest} className="flex items-start gap-2 text-xs text-slate-700">
                  <input type="checkbox" name="interests" value={interest} className="mt-0.5 accent-emerald-700" />
                  <span>{interest}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2 rounded-xl bg-white/70 p-3 text-xs text-slate-700">
            <label className="flex items-start gap-2">
              <input type="checkbox" name="meteorologicalConsent" required className="mt-0.5 accent-emerald-700" />
              <span>Acepto recibir avisos meteorológicos para mi finca por WhatsApp y/o notificaciones.</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="commercialConsent" className="mt-0.5 accent-emerald-700" />
              <span>Acepto recibir información comercial de TecRural sobre servicios, sensores, diagnóstico agrícola y Terracía.</span>
            </label>
            <p className="leading-5 text-slate-500">Responsable: Manuel Carrasco García. Puedes retirar tu consentimiento escribiendo a <a className="font-semibold text-emerald-800 underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a>. Consulta la <Link className="font-semibold text-emerald-800 underline" href="/privacidad">política de privacidad</Link>.</p>
          </div>
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
          {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">{sending ? 'Enviando...' : 'Enviar solicitud'}</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white">Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
