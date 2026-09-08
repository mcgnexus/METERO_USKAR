'use client';

import { FormEvent, useState } from 'react';

/**
 * Retirada de consentimiento por finalidad (comercial o avisos de la finca).
 * Ambas son independientes y revocables; la retirada no borra la evidencia
 * previa, solo marca revoked_at en el registro de consentimiento.
 */
export function ConsentWithdrawForm() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'sending') return;
    setError(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      phone: String(form.get('phone') ?? ''),
      purpose: String(form.get('purpose') ?? 'commercial'),
    };

    setStatus('sending');
    try {
      const response = await fetch('/api/leads/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        setStatus('done');
      } else {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        setError(result.error ?? 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
        setStatus('error');
      }
    } catch {
      setError('Sin conexión. Comprueba tu red y vuelve a intentarlo.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900" role="status">
        Solicitud de retirada registrada. El consentimiento indicado queda revocado y no recibirás más comunicaciones de esa finalidad.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="withdraw-phone" className="text-xs font-semibold text-slate-700">
          Teléfono / WhatsApp
          <input
            id="withdraw-phone"
            name="phone"
            required
            maxLength={30}
            inputMode="tel"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500"
          />
        </label>
        <label htmlFor="withdraw-purpose" className="text-xs font-semibold text-slate-700">
          Consentimiento a retirar
          <select
            id="withdraw-purpose"
            name="purpose"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <option value="commercial">Comercial (sensores, diagnóstico, riego…)</option>
            <option value="service_alerts">Avisos de mi finca (dejaré de recibir avisos)</option>
          </select>
        </label>
      </div>
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-full bg-sky-700 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-sky-800 disabled:opacity-50"
      >
        {status === 'sending' ? 'Enviando...' : 'Retirar consentimiento'}
      </button>
    </form>
  );
}
