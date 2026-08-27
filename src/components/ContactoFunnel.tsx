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

    try {
      const response = await fetch('/api/leads/agricultural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'No se pudo enviar la solicitud.');
      track('lead_form_submitted', { crop: payload.crop, municipality: payload.municipality, page: 'contacto' });
      setStep('whatsapp');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo enviar la solicitud.');
    } finally {
      setSending(false);
    }
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
      <div className="mx-auto max-w-lg px-4 pt-4 pb-24">
        <header className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">🏔️ Meteo Huéscar</p>
          <h1 className="mt-1 text-xl font-black text-slate-900">Contacto</h1>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Cuéntanos sobre tu finca y te conectamos con TecRural.
          </p>
        </header>

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
                <label className="text-xs font-semibold text-slate-700">
                  Nombre
                  <input name="name" required maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Teléfono / WhatsApp
                  <input name="phone" required maxLength={30} inputMode="tel" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Municipio
                  <input name="municipality" required maxLength={80} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Superficie aproximada
                  <select name="area" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600">
                    <option value="">Selecciona</option>
                    {areas.map((a) => <option key={a}>{a}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Cultivo
                <select name="crop" required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600">
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
            {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
            <button type="submit" disabled={sending} className="w-full rounded-full bg-sky-700 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50">
              {sending ? 'Enviando...' : 'Siguiente'}
            </button>
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

        {/* Step 3: WhatsApp */}
        {step === 'whatsapp' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm text-center space-y-3">
              <span className="text-3xl">💬</span>
              <p className="text-sm font-bold text-emerald-900">¿Hablas con TecRural ahora?</p>
              <p className="text-xs text-emerald-800/80 leading-5">
                {selectedInterests.length > 0
                  ? `Te conectamos directamente para hablar sobre ${selectedInterests.map((id) => INTEREST_OPTIONS.find((o) => o.id === id)?.label).filter(Boolean).join(', ')}.`
                  : 'Te conectamos directamente con TecRural.'}
                {formMunicipality ? ` Finca en ${formMunicipality}.` : ''}
              </p>
            </div>

            <a
              href={buildWhatsAppUrl()}
              target="_blank"
              rel="noreferrer"
              onClick={() => track('whatsapp_clicked', { context: 'contacto-funnel-final', interests: selectedInterests })}
              className="flex items-center justify-center gap-2 w-full rounded-full bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              💬 Hablar ahora con TecRural
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
