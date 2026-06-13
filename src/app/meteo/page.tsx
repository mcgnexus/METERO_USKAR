'use client';

import WeatherDashboard from '@/components/WeatherDashboard';

export default function MeteoPage() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#10233f] border-b border-[#1B3668] shadow-lg shadow-slate-900/15">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
            Observatorio Meteorológico de Huéscar
          </h1>
          <p className="mt-1 text-sm font-medium text-sky-100">
            Dashboard público · Datos en tiempo real · Modelo microclimático local
          </p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <WeatherDashboard variant="neutral" />
      </main>
    </div>
  );
}
