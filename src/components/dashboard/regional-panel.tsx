'use client';

import { useEffect, useState } from 'react';

interface RegionPoint {
  name: string;
  lat: number;
  lon: number;
  elevation: number;
  emoji: string;
  desc: string;
}

const REGION_POINTS: RegionPoint[] = [
  { name: 'Huéscar', lat: 37.8094, lon: -2.5392, elevation: 953, emoji: '🏘️', desc: 'Casco urbano' },
  { name: 'Baza', lat: 37.4894, lon: -2.7722, elevation: 785, emoji: '🏙️', desc: 'AEMET 5047E' },
  { name: 'Puebla de Don Fadrique', lat: 37.9667, lon: -2.2500, elevation: 1060, emoji: '⛰️', desc: 'Norte altiplano' },
  { name: 'Orce', lat: 37.7167, lon: -2.4667, elevation: 940, emoji: '🦴', desc: 'Cuenca sedimentaria' },
  { name: 'Castril', lat: 37.8000, lon: -2.7500, elevation: 890, emoji: '🦅', desc: 'Sierra de Castril' },
  { name: 'Cúllar', lat: 37.5833, lon: -2.5667, elevation: 890, emoji: '🌲', desc: 'Límite Baza' },
  { name: 'Galera', lat: 37.7500, lon: -2.5667, elevation: 900, emoji: '🏛️', desc: 'Yacimiento ibero' },
  { name: 'San Clemente', lat: 37.8667, lon: -2.4333, elevation: 1101, emoji: '💧', desc: 'AEMET 5051X (pantano)' },
];

interface PointData {
  name: string;
  emoji: string;
  desc: string;
  tempC: number | null;
  windKmh: number | null;
  humidityPct: number | null;
  weatherCode: number | null;
  elevation: number;
  loading: boolean;
}

function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return '🌤️';
  if (code <= 48) return '🌫️';
  if (code <= 67) return '🌧️';
  if (code <= 77) return '🌨️';
  if (code <= 82) return '🌦️';
  if (code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}

function tempColor(t: number | null): string {
  if (t === null) return 'text-slate-400';
  if (t >= 35) return 'text-red-600';
  if (t >= 30) return 'text-orange-600';
  if (t >= 25) return 'text-amber-600';
  if (t >= 15) return 'text-emerald-600';
  if (t >= 5) return 'text-sky-600';
  return 'text-blue-600';
}

export function RegionalPanel() {
  const [points, setPoints] = useState<PointData[]>(
    REGION_POINTS.map((p) => ({ name: p.name, emoji: p.emoji, desc: p.desc, tempC: null, windKmh: null, humidityPct: null, weatherCode: null, elevation: p.elevation, loading: true }))
  );

  useEffect(() => {
    async function fetchAll() {
      const lats = REGION_POINTS.map((p) => p.lat).join(',');
      const lons = REGION_POINTS.map((p) => p.lon).join(',');
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
        `&timezone=auto&forecast_days=1`;

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();

        const dataArr = Array.isArray(json) ? json : [json];
        const newPoints: PointData[] = dataArr.map((d: Record<string, unknown>, i: number) => {
          const cur = d.current as Record<string, unknown> | undefined;
          return {
            name: REGION_POINTS[i].name,
            emoji: REGION_POINTS[i].emoji,
            desc: REGION_POINTS[i].desc,
            tempC: (cur?.temperature_2m as number) ?? null,
            humidityPct: (cur?.relative_humidity_2m as number) ?? null,
            weatherCode: (cur?.weather_code as number) ?? null,
            windKmh: (cur?.wind_speed_10m as number) ?? null,
            elevation: REGION_POINTS[i].elevation,
            loading: false,
          };
        });
        newPoints.sort((a, b) => (b.tempC ?? -999) - (a.tempC ?? -999));
        setPoints(newPoints);
      } catch {
        setPoints((prev) => prev.map((p) => ({ ...p, loading: false })));
      }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const allLoading = points.every((p) => p.loading);
  const temps = points.map((p) => p.tempC).filter((t): t is number => t !== null);
  const maxTemp = temps.length ? Math.max(...temps) : null;
  const minTemp = temps.length ? Math.min(...temps) : null;
  const gradient = maxTemp !== null && minTemp !== null ? (maxTemp - minTemp).toFixed(1) : null;

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Panoramica regional</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">🗺️ Altiplano de Granada</h3>
        </div>
        {gradient !== null && (
          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 sm:px-3 sm:text-xs">
            Gradiente: {gradient}°C
          </span>
        )}
      </div>

      {allLoading ? (
        <div className="mt-6 flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
          {points.map((p) => (
            <div
              key={p.name}
              className="rounded-[16px] border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:shadow-md sm:rounded-[20px] sm:p-4"
            >
              <div className="flex items-center justify-center gap-1">
                <span className="text-base sm:text-lg">{p.emoji}</span>
                <p className="text-xs font-bold text-slate-800 sm:text-sm">{p.name}</p>
              </div>
              <p className="text-[10px] text-slate-400 sm:text-[11px]">{p.desc} · {p.elevation}m</p>
              <p className="mt-1.5 text-2xl sm:mt-2 sm:text-3xl">{p.weatherCode !== null ? weatherEmoji(p.weatherCode) : '🌡️'}</p>
              <p className={`mt-0.5 text-xl font-bold sm:mt-1 sm:text-2xl ${tempColor(p.tempC)}`}>
                {p.tempC !== null ? `${p.tempC.toFixed(1)}°` : '—'}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] text-slate-500 sm:mt-2 sm:gap-3 sm:text-[11px]">
                <span>💧 {p.humidityPct !== null ? `${p.humidityPct.toFixed(0)}%` : '—'}</span>
                <span>💨 {p.windKmh !== null ? `${p.windKmh.toFixed(0)} km/h` : '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[11px] text-slate-400">
        Datos en tiempo real de Open-Meteo para 8 puntos del Altiplano · Actualizacion cada 5 min
      </p>
    </div>
  );
}
