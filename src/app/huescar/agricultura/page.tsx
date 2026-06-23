import Link from 'next/link';
import AgriculturaDashboard from '@/components/AgriculturaDashboard';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';

export const dynamic = 'force-dynamic';

export default async function AgriculturaPage() {
  const [climateResult, weatherResult] = await Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
  ]);

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="app-shell space-y-6">
        <header className="surface-card flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Agricultura</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Capa agronómica</h1>
            <p className="mt-1 text-sm text-slate-600">Observatorio, cultivos, riego y diagnóstico fenológico de Huéscar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/huescar" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">← Volver a Huéscar</Link>
            <Link href="/motor-climatico" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Motor climático</Link>
          </div>
        </header>
        <main>
          <AgriculturaDashboard
            initialClimateData={climateResult.status === 'fulfilled' ? climateResult.value : null}
            initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
          />
        </main>
      </div>
    </div>
  );
}
