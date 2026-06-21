'use client';

import Link from 'next/link';
import ClimateEngineDashboard from '@/components/ClimateEngineDashboard';

export default function MotorClimaticoPage() {
  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="app-shell space-y-6">
        <header className="surface-card flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Capa cientifica</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">El Motor Climático</h1>
            <p className="mt-1 text-sm text-slate-600">Contraste AEMET, RIA, estacion propia y calibracion del llano.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/llano" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Huescar</Link>
            <Link href="/meteo" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Panel completo</Link>
          </div>
        </header>
        <main><ClimateEngineDashboard /></main>
      </div>
    </div>
  );
}
