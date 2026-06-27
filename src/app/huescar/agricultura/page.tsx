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
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-lg px-4 pt-4 pb-24">
        <header className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700">🌾 Meteo Huéscar Campo</p>
              <h1 className="mt-0.5 text-xl font-black text-slate-900">Campo</h1>
            </div>
            <Link
              href="/huescar"
              className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              ← Volver
            </Link>
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
