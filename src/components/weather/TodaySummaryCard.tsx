import type { CurrentWeather } from '@/types/weather';
import { fmt, weatherEmoji, weatherCodeDescription } from '@/lib/display';

export function TodaySummaryCard({ forecast }: { forecast: CurrentWeather }) {
  const icon = weatherEmoji(forecast.weatherCode ?? 0);
  const desc = weatherCodeDescription(forecast.weatherCode ?? 0);
  return (
    <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-5 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-5xl font-bold tracking-tight">
            {fmt(forecast.temperatureC, 1)}°C
          </p>
          <p className="text-blue-100 text-sm mt-1">
            Sensación {fmt(forecast.apparentTemperatureC, 1)}°C
          </p>
        </div>
        <div className="text-center">
          <span className="text-5xl block">{icon}</span>
          <p className="text-sm text-blue-100 mt-1">{desc}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
        <div className="bg-white/15 rounded-xl py-2">
          <p className="text-white/80 text-[10px] uppercase tracking-wide">Viento</p>
          <p className="font-semibold text-white">{fmt(forecast.windSpeedKmh, 0)} km/h</p>
        </div>
        <div className="bg-white/15 rounded-xl py-2">
          <p className="text-white/80 text-[10px] uppercase tracking-wide">Humedad</p>
          <p className="font-semibold text-white">{fmt(forecast.humidityPct, 0)}%</p>
        </div>
        <div className="bg-white/15 rounded-xl py-2">
          <p className="text-white/80 text-[10px] uppercase tracking-wide">Lluvia</p>
          <p className="font-semibold text-white">
            {forecast.precipitationMm != null ? `${fmt(forecast.precipitationMm, 1)} mm` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
