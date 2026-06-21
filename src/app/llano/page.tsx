'use client';

import Link from 'next/link';
import LlanoPulseDashboard from '@/components/LlanoPulseDashboard';

export default function LlanoPage() {
  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="app-shell space-y-6">
        <header className="surface-card flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Observatorio de Huéscar</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Huéscar</h1>
            <p className="mt-1 text-sm text-slate-600">Vista rapida para poblacion, agricultura y ganaderia.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/tiempo" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Tiempo</Link>
            <Link href="/motor-climatico" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Motor climatico</Link>
          </div>
        </header>
        <main><LlanoPulseDashboard /></main>
      </div>
    </div>
  );
}
