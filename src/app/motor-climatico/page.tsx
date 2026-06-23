import Link from 'next/link';
import ClimateEngineDashboard from '@/components/ClimateEngineDashboard';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';

export const dynamic = 'force-dynamic';

export default async function MotorClimaticoPage() {
  const [climateResult, weatherResult] = await Promise.allSettled([
    getClimateCalibrationPayload(),
    getCurrentWeatherPayload(),
  ]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="mx-auto max-w-lg px-4 pt-4 pb-8">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">Capa científica</p>
            <h1 className="mt-0.5 text-xl font-black text-slate-900">Motor Climático</h1>
          </div>
          <Link
            href="/huescar"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            ← Huéscar
          </Link>
        </header>
        <main>
          <ClimateEngineDashboard
            initialClimateData={climateResult.status === 'fulfilled' ? climateResult.value : null}
            initialWeatherData={weatherResult.status === 'fulfilled' ? weatherResult.value : null}
          />
        </main>
      </div>
    </div>
  );
}
