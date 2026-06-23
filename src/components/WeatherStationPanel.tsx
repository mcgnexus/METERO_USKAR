'use client';

import { useState, useEffect } from 'react';

interface StationLikeRecord {
  id?: unknown;
  estacion_id?: unknown;
  codigo?: unknown;
  nombre?: unknown;
  name?: unknown;
  location_name?: unknown;
  node_code?: unknown;
  estacion?: unknown;
  temperature?: unknown;
  temperatura?: unknown;
  temp?: unknown;
  t?: unknown;
  humidity?: unknown;
  humedad?: unknown;
  hr?: unknown;
  precipitation?: unknown;
  precipitacion?: unknown;
  precip?: unknown;
  lluvia?: unknown;
  prec?: unknown;
  wind_speed?: unknown;
  viento?: unknown;
  wind?: unknown;
  vv?: unknown;
  battery?: unknown;
  bateria?: unknown;
  voltaje?: unknown;
  battery_v?: unknown;
  pressure_hpa?: unknown;
  leaf_temp_c?: unknown;
  soil_moisture_pct?: unknown;
  rssi_dbm?: unknown;
  updated_at?: unknown;
  ultima_actualizacion?: unknown;
  fint?: unknown;
  timestamp?: unknown;
  lat?: unknown;
  latitude?: unknown;
  lon?: unknown;
  longitude?: unknown;
}

interface MiniStation {
  id?: string;
  nombre: string;
  temperature?: number;
  humidity?: number;
  precipitation?: number;
  windSpeed?: number;
  battery?: number;
  batteryV?: number;
  pressureHPa?: number;
  leafTempC?: number;
  soilMoisturePct?: number;
  rssiDbm?: number;
  updatedAt?: string;
  lat?: number;
  lon?: number;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function isStationLikeRecord(value: unknown): value is StationLikeRecord {
  return value !== null && typeof value === 'object';
}

function normalizeStation(raw: StationLikeRecord): MiniStation {
  const id = raw.id ?? raw.estacion_id ?? raw.codigo;
  return {
    id: id !== undefined && id !== null ? String(id) : undefined,
    nombre: toOptionalString(raw.nombre)
      ?? toOptionalString(raw.name)
      ?? toOptionalString(raw.location_name)
      ?? toOptionalString(raw.node_code)
      ?? toOptionalString(raw.estacion)
      ?? 'Sin nombre',
    temperature: toOptionalNumber(raw.temperature ?? raw.temperatura ?? raw.temp ?? raw.t),
    humidity: toOptionalNumber(raw.humidity ?? raw.humedad ?? raw.hr),
    precipitation: toOptionalNumber(raw.precipitation ?? raw.precipitacion ?? raw.precip ?? raw.lluvia ?? raw.prec),
    windSpeed: toOptionalNumber(raw.wind_speed ?? raw.viento ?? raw.wind ?? raw.vv),
    battery: toOptionalNumber(raw.battery ?? raw.bateria ?? raw.voltaje),
    batteryV: toOptionalNumber(raw.battery_v),
    pressureHPa: toOptionalNumber(raw.pressure_hpa),
    leafTempC: toOptionalNumber(raw.leaf_temp_c),
    soilMoisturePct: toOptionalNumber(raw.soil_moisture_pct),
    rssiDbm: toOptionalNumber(raw.rssi_dbm),
    updatedAt: toOptionalString(raw.updated_at ?? raw.ultima_actualizacion ?? raw.fint ?? raw.timestamp),
    lat: toOptionalNumber(raw.lat ?? raw.latitude),
    lon: toOptionalNumber(raw.lon ?? raw.longitude),
  };
}

export default function WeatherStationPanel({
  variant = 'neutral',
  isAdmin = false,
}: {
  variant?: 'neutral' | 'ayto';
  isAdmin?: boolean;
}) {
  const [stations, setStations] = useState<MiniStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/weather/stations');
        if (!response.ok) throw new Error(`Error ${response.status}`);
        const data: unknown = await response.json();

        if (cancelled) return;

        if (Array.isArray(data)) {
          setStations(data.filter(isStationLikeRecord).map(normalizeStation));
        } else {
          setStations([]);
        }
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        setError(error instanceof Error ? error.message : 'Error de conexiÃ³n');
        setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, []);

  const border = variant === 'ayto' ? 'border-[#e8e4d8]' : 'border-slate-200';
  const primary = variant === 'ayto' ? 'text-[#1B3668]' : 'text-slate-800';

  return (
    <div className={`rounded-xl border ${border} bg-white p-4 text-slate-800`}>
      <h3 className={`mb-3 font-semibold ${primary}`}>ðŸ“¡ Miniestaciones locales</h3>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          Cargando estaciones...
        </div>
      )}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {!loading && !error && stations.length === 0 && (
        <p className="text-sm text-slate-400">No hay estaciones disponibles</p>
      )}
      {stations.length > 0 && (
        <div className="space-y-3">
          {stations.map((station, index) => (
            <div key={station.id ?? index} className="border-b border-slate-100 pb-2 text-sm last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="truncate font-medium text-slate-700">{station.nombre}</span>
                {isAdmin && (station.battery !== undefined || station.batteryV !== undefined) && (
                  <span className="text-xs font-medium text-green-600">
                    {station.batteryV !== undefined ? `${station.batteryV.toFixed(2)}V` : `${station.battery}%`}
                  </span>
                )}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-1 text-xs text-slate-500">
                {station.temperature !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Temp</span>
                    <span className="font-medium text-slate-700">{station.temperature.toFixed(1)}Â°C</span>
                  </div>
                )}
                {station.humidity !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Humedad</span>
                    <span className="font-medium text-slate-700">{station.humidity}%</span>
                  </div>
                )}
                {station.pressureHPa !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">PresiÃ³n</span>
                    <span className="font-medium text-slate-700">{station.pressureHPa.toFixed(0)} hPa</span>
                  </div>
                )}
                {isAdmin && station.precipitation !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Precip</span>
                    <span className="font-medium text-slate-700">{station.precipitation.toFixed(1)} mm</span>
                  </div>
                )}
                {isAdmin && station.windSpeed !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Viento</span>
                    <span className="font-medium text-slate-700">{station.windSpeed} km/h</span>
                  </div>
                )}
                {isAdmin && station.soilMoisturePct !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Suelo</span>
                    <span className="font-medium text-slate-700">{station.soilMoisturePct.toFixed(0)}%</span>
                  </div>
                )}
                {isAdmin && station.rssiDbm !== undefined && (
                  <div>
                    <span className="block text-[10px] text-slate-400">SeÃ±al</span>
                    <span className="font-medium text-slate-700">{station.rssiDbm} dBm</span>
                  </div>
                )}
              </div>
              {isAdmin && station.updatedAt && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {new Date(station.updatedAt).toLocaleString('es-ES')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
