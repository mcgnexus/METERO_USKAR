'use client';

import { useTrackEvent } from '@/hooks/useTrackEvent';

const WHATSAPP_URL =
  'https://wa.me/34614242716?text=' +
  encodeURIComponent('Hola, vengo de Meteo Huéscar y quiero recibir avisos para mi finca.');

/**
 * Variante A del experimento de captación: WhatsApp de 1 clic.
 * Sin formulario: el visitante va directo a la conversación. El "inicio" y el
 * "lead" se miden con el mismo evento (whatsapp_click), que además lleva la
 * variante en metadata para poder comparar el embudo con el formulario B.
 */
export function WhatsappOneClick() {
  const track = useTrackEvent();

  return (
    <section className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 p-4">
      <p className="text-sm font-black text-emerald-950">¿Quieres recibir avisos para tu cultivo?</p>
      <p className="mt-1 text-xs leading-5 text-emerald-900/80">
        Así empezamos: un toque y seguimos hablando por WhatsApp. Sin formularios ni esperas.
      </p>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        onClick={() => {
          track('lead_form_open', { variant: 'A', context: 'whatsapp-one-click' });
          track('whatsapp_click', { variant: 'A', context: 'whatsapp-one-click', cta: 'Recibir avisos por WhatsApp (1 clic)' });
        }}
        className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-black text-white shadow-sm hover:bg-emerald-800 active:scale-95"
      >
        <span aria-hidden="true">💬</span> Recibir avisos por WhatsApp
      </a>
      <p className="mt-2 text-center text-[10px] leading-4 text-emerald-900/60">
        Te respondemos en menos de 24 h en horario laboral.
      </p>
    </section>
  );
}