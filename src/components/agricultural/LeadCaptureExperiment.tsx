'use client';

import { useEffect, useState } from 'react';
import { useTrackEvent } from '@/hooks/useTrackEvent';
import { getLeadVariant, type LeadVariant } from '@/lib/leadAbTest';
import { WhatsappOneClick } from '@/components/agricultural/WhatsappOneClick';
import { MinimalLeadForm } from '@/components/agricultural/MinimalLeadForm';

/**
 * Experimento A/B de captación de leads (punto 1.5):
 *  - Variante A: WhatsApp de 1 clic.
 *  - Variante B: formulario mínimo (teléfono, municipio, cultivo) con paso 2 opcional.
 * La asignación es estable por visitante (localStorage) y utiliza la variante
 * como dimensión en todos los eventos del embudo para medir inicio, abandono
 * y lead válido de cada variante.
 */
export function LeadCaptureExperiment() {
  const track = useTrackEvent();
  // La asignación A/B es cliente (localStorage), así que evitamos mismatch de
  // hidratación resolviéndola en useEffect y pintando un placeholder neutro.
  const [variant, setVariant] = useState<LeadVariant | null>(null);

  useEffect(() => {
    let forced: string | null = null;
    if (typeof window !== 'undefined') {
      forced = new URLSearchParams(window.location.search).get('ab');
    }
    const assigned = getLeadVariant(forced === 'A' || forced === 'B' ? forced : null);
    setVariant(assigned);
    track('ab_test_assigned', { experiment: 'lead-capture', variant: assigned });
  }, [track]);

  if (!variant) {
    return (
      <section className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-4" aria-hidden="true">
        <p className="text-sm font-black text-emerald-950">¿Quieres recibir avisos para tu cultivo?</p>
        <div className="mt-3 min-h-[44px] w-2/3 animate-pulse rounded-full bg-emerald-200" />
      </section>
    );
  }

  return variant === 'A' ? <WhatsappOneClick /> : <MinimalLeadForm />;
}