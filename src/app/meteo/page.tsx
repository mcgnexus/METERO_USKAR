'use client';

import { useWeatherData } from '@/hooks/useWeatherData';
import WeatherDashboard from '@/components/WeatherDashboard';

export default function MeteoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800">Observatorio Meteorológico de Huéscar</h1>
          <p className="text-sm text-slate-500">Dashboard público · Datos en tiempo real</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <WeatherDashboard variant="neutral" />
      </main>
    </div>
  );
}
