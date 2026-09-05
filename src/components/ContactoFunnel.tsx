'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { captureUtms } from '@/lib/utm';

const crops = ['Olivar', 'Almendro', 'Pistacho', 'Hortícola', 'Otro'];
const areas = ['Menos de 5 ha', '5-20 ha', '20-50 ha', 'Más de 50 ha', 'Prefiero no decirlo'];

const INTEREST_OPTIONS = [
  { id: 'riego', label: 'Riego', icon: '💧' },
  { id: 'heladas', label: 'Heladas', icon: '❄️' },
  { id: 'sensores', label: 'Sensores', icon: '📡' },
  { id: 'diagnostico', label: 'Diagnóstico de plantas', icon: '🔍' },
  { id: 'automatizacion', label: 'Automatización', icon: '⚙️' },
  { id: 'terracia', label: 'Información sobre Terracía', icon: '🌾' },
];

type Step = 'form' | 'segment' | 'whatsapp';

type LeadDetails = {
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  meteorologicalConsent: boolean;
  commercialConsent: boolean;
  website: string;
};

export function ContactoFunnel() {
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [formMunicipality, setFormMunicipality] = useState('');
  const [leadDetails, setLeadDetails] = useState<LeadDetails | null>(null);
  const track = useTrackEvent();

  function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    const details: LeadDetails = {
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      municipality: String(form.get('municipality') ?? ''),
      crop: String(form.get('crop') ?? ''),
      area: String(form.get('area') ?? ''),
      meteorologicalConsent: form.get('meteorologicalConsent') === 'on',
      commercialConsent: form.get('commercialConsent') === 'on',
      website: String(form.get('website') ?? ''),
    };

    setLeadDetails(details);
    setFormMunicipality(details.municipality);
    track('form_step_1_completed', { municipality: details.municipality, crop: details.crop });
    setStep('segment');
  }

  async function submitLead() {
    if (!leadDetails) return;
    setError(null);

    const interests = INTEREST_OPTIONS
      .filter((opt) => selectedInterests.includes(opt.id))
      .map((opt) => opt.label);
    if (interests.length === 0) {
      setError('Selecciona al menos un tipo de ayuda para continuar.');
      return;
    }
    track('form_step_2_completed', { interests });
    setSending(true);
    const utms = captureUtms();
    const payload = {
      ...leadDetails,
      interests,
      source: 'meteo-huescar-contacto',
      landingPage: '/huescar/contacto',
      utmSource: utms.utm_source,
      utmMedium: utms.utm_medium,
      utmCampaign: utms.utm_campaign,
    };

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch('/api/leads/agricultural', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? 'No se pudo enviar la solicitud.');
        track('lead_form_submitted', { crop: payload.crop, municipality: payload.municipality, page: 'contacto' });
        track('lead_qualified', { crop: payload.crop, municipality: payload.municipality, interests });
        setStep('whatsapp');
        setSending(false);
        return;
      } catch (submitError) {
        const msg = submitError instanceof Error ? submitError.message : 'No se pudo enviar la solicitud.';
        if (attempt === 0) continue;
        setError(msg);
      }
    }
    setSending(false);
  }

  function toggleInterest(id: string) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }

  function buildWhatsAppUrl(): string {
    const interestLabels = selectedInterests
      .map((id) => INTEREST_OPTIONS.find((o) => o.id === id)?.label)
      .filter(Boolean)
      .join(', ');
    const text = `Hola TecRural. Vengo de Meteo Huéscar.${interestLabels ? ` Me interesa recibir información sobre ${interestLabels}` : ''} para mi finca${formMunicipality ? ` en ${formMunicipality}` : ''}.`;
    return `https://wa.me/34614242716?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-6xl px-4 pt-4 pb-24 lg:pt-20">
        <header className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-1 text-xl font-black text-slate-900">Contacto</h1>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Cuéntanos sobre tu finca y te conectamos con TecRural.
          </p>
        </header>

        {step === 'form' && (
          <a
            href="https://wa.me/34614242716?text=Hola%2C%20he%20consultado%20Meteo%20Hu%C3%A9scar%20y%20quiero%20recibir%20avisos%20para%20mi%20finca."
            target="_blank"
            rel="noreferrer"
            onClick={() => track('whatsapp_clicked', { context: 'contacto-top-cta', cta: 'Hablar con TecRural' })}
            className="mb-6 flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Hablar con TecRural
          </a>
        )}

        {step === 'form' && (
          <p className="-mt-4 mb-6 text-center text-xs text-slate-400">o rellena el formulario para un seguimiento personalizado</p>
        )}

        {/* Step indicator */}
        <div className="mb-6 flex items-center gap-2">
          {(['form', 'segment', 'whatsapp'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step === s ? 'bg-sky-700 text-white' :
                (['form', 'segment', 'whatsapp'].indexOf(step) > i ? 'bg-sky-200 text-sky-800' : 'bg-slate-200 text-slate-500')
              }`}>
                {i + 1}
              </div>
              {i < 2 && <div className={`h-0.5 w-8 ${['form', 'segment', 'whatsapp'].indexOf(step) > i ? 'bg-sky-300' : 'bg-slate-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Form */}
        {step === 'form' && (
          <form onSubmit={handleDetailsSubmit} onChange={() => { if (!started) { setStarted(true); track('lead_form_started', { page: 'contacto' }); } }} className="space-y-4" noValidate>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-bold text-slate-900">Datos de tu finca</p>
              <div className="grid gap-3 sm:grid-cols-2">
                  <label htmlFor="contact-name" className="text-xs font-semibold text-slate-700">
                    Nombre <span className="font-normal text-slate-400">(opcional)</span>
                    <input id="contact-name" name="name" maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? 'contact-form-error' : undefined} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500" />
                </label>
                <label htmlFor="contact-phone" className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp
                  <input id="contact-phone" name="phone" required maxLength={30} inputMode="tel" aria-invalid={Boolean(error)} aria-describedby={error ? 'contact-form-error' : undefined} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500" />
                </label>
                <label htmlFor="contact-municipality" className="text-xs font-semibold text-slate-700">
                  Municipio
                  <input id="contact-municipality" name="municipality" required maxLength={80} aria-invalid={Boolean(error)} aria-describedby={error ? 'contact-form-error' : undefined} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500" />
                </label>
                  <label htmlFor="contact-area" className="text-xs font-semibold text-slate-700">
                    Superficie aproximada <span className="font-normal text-slate-400">(opcional)</span>
                    <select id="contact-area" name="area" aria-invalid={Boolean(error)} aria-describedby={error ? 'contact-form-error' : undefined} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500">
                    <option value="">Selecciona</option>
                    {areas.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <label htmlFor="contact-crop" className="block text-xs font-semibold text-slate-700">
                Cultivo
                <select id="contact-crop" name="crop" required aria-invalid={Boolean(error)} aria-describedby={error ? 'contact-form-error' : undefined} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500">
                  <option value="">Selecciona</option>
                  {crops.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
              <p className="text-sm font-bold text-slate-900">Consentimientos</p>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" name="meteorologicalConsent" required className="mt-0.5 accent-sky-700" />
                <span>Acepto recibir avisos meteorológicos para mi finca por WhatsApp y/o notificaciones.</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700">
                <input type="checkbox" name="commercialConsent" className="mt-0.5 accent-sky-700" />
                <span>Acepto recibir información comercial de TecRural sobre servicios, sensores, diagnóstico agrícola y Terracía.</span>
              </label>
              <p className="leading-5 text-slate-500">Responsable: Manuel Carrasco García. Puedes retirar tu consentimiento escribiendo a <a className="font-semibold text-sky-800 underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a>. Consulta la <Link className="font-semibold text-sky-800 underline" href="/privacidad">política de privacidad</Link>.</p>
            </div>

            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            {error && <p id="contact-form-error" role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
              <button type="submit" disabled={sending} className="w-full rounded-full bg-sky-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50">
                {sending ? 'Enviando...' : 'Continuar para recibir mis avisos'}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">
                Te responderemos personalmente, normalmente en menos de 24 horas.
              </p>
            </form>
        )}

        {/* Step 2: Segment */}
        {step === 'segment' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-slate-900">¿Qué tipo de ayuda necesitas?</p>
              <p className="mt-1 text-xs text-slate-600">Selecciona uno o varios intereses para que TecRural pueda orientarte mejor.</p>
              <div className="mt-3 grid gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selectedInterests.includes(opt.id)
                        ? 'border-sky-400 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-lg">{opt.icon}</span>
                    <span>{opt.label}</span>
                    {selectedInterests.includes(opt.id) && <span className="ml-auto text-sky-600">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={submitLead}
              disabled={sending}
              className="w-full rounded-full bg-sky-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
            >
              {sending ? 'Enviando...' : 'Continuar'}
            </button>
            {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
          </div>
        )}

        {/* Step 3: Confirmation and WhatsApp */}
        {step === 'whatsapp' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <div className="text-center">
                <span className="text-3xl">✅</span>
                <p className="mt-2 text-base font-bold text-emerald-900">Solicitud recibida correctamente.</p>
                <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                  TecRural revisará tus datos y contactará contigo para definir los avisos más útiles para tu finca.
                </p>
              </div>

              <div className="mt-5 space-y-3 border-t border-emerald-200 pt-4 text-sm text-emerald-950">
                <p><strong>Plazo de respuesta:</strong> normalmente en menos de 24 horas.</p>
                <p><strong>Canal de contacto:</strong> WhatsApp o teléfono, usando el número que has indicado.</p>
                <p>
                  <strong>Qué recibirás:</strong> avisos personalizados de heladas, calor, viento, lluvia y riego,
                  según tu cultivo y las necesidades de tu finca.
                </p>
              </div>
            </div>

            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('whatsapp_clicked', { context: 'contacto-funnel-final', interests: selectedInterests })}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              💬 Escribir ahora por WhatsApp
            </a>

            <Link
              href="/huescar"
              className="flex items-center justify-center w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              ← Volver al tiempo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
