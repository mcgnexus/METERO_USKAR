'use client';

import { useState, useEffect } from 'react';

interface MiniStation {
  id?: string;
  nombre?: string;
  name?: string;
  temperature?: number;
  temperatura?: number;
  humidity?: number;
  humedad?: number;
  precipitation?: number;
  precipitacion?: number;
  wind_speed?: number;
  viento?: number;
  battery?: number;
  bateria?: number;
  battery_v?: number;
  pressure_hpa?: number;
  leaf_temp_c?: number;
  soil_moisture_pct?: number;
  rssi_dbm?: number;
  updated_at?: string;
  ultima_actualizacion?: string;
  lat?: number;
  lon?: number;
}

function normalizeStation(raw: any): MiniStation {
  return {
    id: raw.id ?? raw.estacion_id ?? raw.codigo,
    nombre: raw.nombre ?? raw.name ?? raw.location_name ?? raw.node_code ?? raw.estacion ?? 'Sin nombre',
    temperature: raw.temperature ?? raw.temperatura ?? raw.temp ?? raw.t,
    humidity: raw.humidity ?? raw.humedad ?? raw.hr,
    precipitation: raw.precipitation ?? raw.precipitacion ?? raw.precip ?? raw.lluvia ?? raw.prec,
    wind_speed: raw.wind_speed ?? raw.viento ?? raw.wind ?? raw.vv,
    battery: raw.battery ?? raw.bateria ?? raw.voltaje,
    battery_v: raw.battery_v,
    pressure_hpa: raw.pressure_hpa,
    leaf_temp_c: raw.leaf_temp_c,
    soil_moisture_pct: raw.soil_moisture_pct,
    rssi_dbm: raw.rssi_dbm,
    updated_at: raw.updated_at ?? raw.ultima_actualizacion ?? raw.fint ?? raw.timestamp,
    lat: raw.lat ?? raw.latitude,
    lon: raw.lon ?? raw.longitude,
  };
}

export default function WeatherStationPanel({ variant = 'neutral' }: { variant?: 'neutral' | 'ayto' }) {
  const [stations, setStations] = useState<MiniStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/weather/stations');
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          if (Array.isArray(data) && data.length > 0) {
            setStations(data.map(normalizeStation));
          } else {
            setStations([]);
          }
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Error de conexión');
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const border = variant === 'ayto' ? 'border-[#e8e4d8]' : 'border-slate-200';
  const primary = variant === 'ayto' ? 'text-[#1B3668]' : 'text-slate-800';

  return (
    <div className={`rounded-xl border ${border} p-4`}>
      <h3 className={`font-semibold mb-3 ${primary}`}>📡 Miniestaciones locales</h3>
      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
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
          {stations.map((s, i) => (
            <div key={s.id ?? i} className="text-sm border-b border-slate-100 last:border-b-0 pb-2 last:pb-0">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 truncate">{s.nombre}</span>
                {(s.battery !== undefined || s.battery_v !== undefined) && (
                  <span className="text-xs font-medium text-green-600">
                    {s.battery_v !== undefined ? `${Number(s.battery_v).toFixed(2)}V` : `${s.battery}%`}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 mt-1 text-xs text-slate-500">
                {s.temperature !== undefined && s.temperature !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Temp</span>
                    <span className="font-medium text-slate-700">{typeof s.temperature === 'number' ? s.temperature.toFixed(1) : s.temperature}°C</span>
                  </div>
                )}
                {s.humidity !== undefined && s.humidity !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Humedad</span>
                    <span className="font-medium text-slate-700">{s.humidity}%</span>
                  </div>
                )}
                {s.precipitation !== undefined && s.precipitation !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Precip</span>
                    <span className="font-medium text-slate-700">{typeof s.precipitation === 'number' ? s.precipitation.toFixed(1) : s.precipitation} mm</span>
                  </div>
                )}
                {s.wind_speed !== undefined && s.wind_speed !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Viento</span>
                    <span className="font-medium text-slate-700">{s.wind_speed} km/h</span>
                  </div>
                )}
                {s.pressure_hpa !== undefined && s.pressure_hpa !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Presión</span>
                    <span className="font-medium text-slate-700">{Number(s.pressure_hpa).toFixed(0)} hPa</span>
                  </div>
                )}
                {s.soil_moisture_pct !== undefined && s.soil_moisture_pct !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Suelo</span>
                    <span className="font-medium text-slate-700">{Number(s.soil_moisture_pct).toFixed(0)}%</span>
                  </div>
                )}
                {s.rssi_dbm !== undefined && s.rssi_dbm !== null && (
                  <div>
                    <span className="block text-[10px] text-slate-400">Señal</span>
                    <span className="font-medium text-slate-700">{s.rssi_dbm} dBm</span>
                  </div>
                )}
              </div>
              {s.updated_at && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {new Date(s.updated_at).toLocaleString('es-ES')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
