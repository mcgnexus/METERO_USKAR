'use client';

import Link from 'next/link';
import { useTrackEvent } from '@/hooks/useTrackEvent';

const WHATSAPP_URL =
  'https://wa.me/34614242716?text=' +
  encodeURIComponent('Hola, he consultado Meteo Huéscar y quiero recibir avisos para mi finca.');

export function TecRuralCtaBanner({ context }: { context?: string }) {
  const track = useTrackEvent();

  return (
    <section className="overflow-hidden rounded-[20px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">🌾 TecRural</p>
          <h2 className="mt-1 text-base font-black text-emerald-950">
            ¿Tienes una finca en Huéscar o el Altiplano?
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-emerald-900/80">
            Recibe avisos personalizados sobre heladas, calor, viento y riego según tu cultivo.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link
            href="/huescar/contacto"
            onClick={() => track('tec_rural_cta_clicked', { context })}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            Quiero avisos para mi finca
          </Link>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track('whatsapp_clicked', { context, source: 'cta-banner' })}
            className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-5 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-50 active:scale-95"
          >
            Hablar con TecRural
          </a>
        </div>
      </div>
    </section>
  );
}
