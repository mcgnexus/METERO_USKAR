'use client';

import Link from 'next/link';
import WeatherDashboard from '@/components/WeatherDashboard';

export default function MeteoPage() {
  return (
    <div className="min-h-screen py-4 sm:py-8">
      <div className="app-shell space-y-4 sm:space-y-6">
        <header className="surface-card flex flex-col gap-4 rounded-[20px] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:rounded-[28px] sm:px-7 sm:py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Panel meteorologico local</p>
            <h1 className="mt-1.5 text-xl font-bold text-slate-950 sm:mt-2 sm:text-3xl">
              Observatorio Meteorológico de Huéscar
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
              Estado actual, pronóstico 14 días, heladas, balance hídrico, alertas fitosanitarias y climatología del Altiplano.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link href="/huescar" className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white sm:px-4 sm:py-2 sm:text-sm">
              🏘️ Huéscar (motor climático)
            </Link>
            <Link href="/motor-climatico" className="rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white sm:px-4 sm:py-2 sm:text-sm">
              Motor climatico
            </Link>
          </div>
        </header>

        <main>
          <WeatherDashboard />
        </main>
      </div>
    </div>
  );
}
