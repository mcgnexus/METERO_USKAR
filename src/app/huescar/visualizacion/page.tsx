import Link from 'next/link';
import VisualizacionDashboard from '@/components/VisualizacionDashboard';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getForecastPayload } from '@/services/forecastPayloadService';
import { getLatestSourceObservation } from '@/lib/weatherStore';
import { fetchZoneWeather } from '@/services/zoneService';
import type { SourceObservation } from '@/types/weather';

export const dynamic = 'force-dynamic';

export default async function VisualizacionPage() {
  const [currentResult, forecastResult, climateResult, aemetResult] = await Promise.allSettled([
    getCurrentWeatherPayload(),
    getForecastPayload(7),
    getClimateCalibrationPayload(),
    getLatestSourceObservation('AEMET'),
  ]);

  const aemetObs = aemetResult.status === 'fulfilled' && aemetResult.value
    ? (aemetResult.value as SourceObservation)
    : null;
  const zonesResult = await Promise.allSettled([fetchZoneWeather(aemetObs)]);

  return (
    <div className="min-h-screen py-6 sm:py-8">
      <div className="app-shell space-y-6">
        <header className="surface-card flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">Meteo Huéscar</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Visualización</h1>
            <p className="mt-1 text-sm text-slate-600">Gráficas interactivas de todos los datos meteorológicos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/huescar" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Panel general</Link>
            <Link href="/huescar/agricultura" className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white">Meteo Huéscar Campo</Link>
          </div>
        </header>
        <main>
          <VisualizacionDashboard
            initialCurrentData={currentResult.status === 'fulfilled' ? currentResult.value : null}
            initialForecastData={forecastResult.status === 'fulfilled' ? forecastResult.value : null}
            initialCalibrationData={climateResult.status === 'fulfilled' ? climateResult.value : null}
            initialZonesData={zonesResult[0].status === 'fulfilled' ? zonesResult[0].value : null}
          />
        </main>
      </div>
    </div>
  );
}
