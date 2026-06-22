'use client';

import Link from 'next/link';
import LlanoPulseDashboard from '@/components/LlanoPulseDashboard';

export default function HuescarPage() {
  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="app-shell space-y-6">
        <header className="surface-card flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">🏔️ Observatorio de Huéscar</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">🏘️ Huéscar</h1>
            <p className="mt-1 text-sm text-slate-600">🌤️ Vista rápida para población, agricultura y ganadería.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/huescar/agricultura" className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">🌾 Capa agronómica</Link>
            <Link href="/huescar/visualizacion" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">📊 Gráficas</Link>
            <Link href="/motor-climatico" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">🌡️ Motor climático</Link>
          </div>
        </header>
        <main><LlanoPulseDashboard /></main>
      </div>
    </div>
  );
}
