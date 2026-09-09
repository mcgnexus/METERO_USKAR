'use client';

import { useTrackEvent } from '@/hooks/useTrackEvent';

const WHATSAPP_URL =
  'https://wa.me/34614242716?text=' +
  encodeURIComponent('Hola, he consultado Meteo Huéscar y quiero recibir avisos para mi finca.');

export function HomeHero() {
  const track = useTrackEvent();

  return (
    <section className="rounded-[20px] bg-gradient-to-br from-emerald-700 to-teal-700 p-5 text-white shadow-lg sm:p-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">🏔️ Meteo Huéscar</p>
      <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">
        El tiempo que te ayuda a decidir en Huéscar
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-emerald-50">
        Previsión local para saber cuándo regar, trabajar y proteger tu finca.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <a
          href="/huescar/contacto"
          onClick={() => track('cta_clicked', { context: 'home-hero', cta: 'Recibir avisos personalizados para mi finca', destination: '/huescar/contacto' })}
          className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-6 text-sm font-black text-emerald-800 shadow-sm transition hover:bg-emerald-50 active:scale-95"
        >
          Recibir avisos personalizados para mi finca
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noreferrer"
          onClick={() => track('whatsapp_clicked', { context: 'home-hero', cta: 'Hablar por WhatsApp' })}
          className="inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-full border border-emerald-300/60 px-5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-600/40 active:scale-95"
        >
          <span aria-hidden="true">💬</span> Hablar por WhatsApp
        </a>
      </div>
    </section>
  );
}
