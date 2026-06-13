'use client';

import { useState } from 'react';
import type { RadarData } from '@/types/weather';

export default function RadarPanel({ radar, variant = 'neutral' }: { radar?: RadarData; variant?: 'neutral' | 'ayto' }) {
  const [showRadarMap, setShowRadarMap] = useState(false);

  if (!radar) return null;

  const isAyto = variant === 'ayto';
  const border = isAyto ? 'border-[#e8e4d8]' : 'border-slate-200';
  const primary = isAyto ? 'text-[#1B3668]' : 'text-slate-800';

  const levelColors: Record<RadarData['level'], string> = {
    ninguno: 'text-green-700 bg-green-50 border-green-200',
    aviso: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    alerta: 'text-orange-700 bg-orange-50 border-orange-200',
    peligro: 'text-red-700 bg-red-50 border-red-200',
  };

  const levelBadges: Record<RadarData['level'], string> = {
    ninguno: 'bg-green-500 text-white',
    aviso: 'bg-yellow-500 text-black',
    alerta: 'bg-orange-500 text-white',
    peligro: 'bg-red-600 text-white',
  };

  return (
    <div className={`rounded-xl border ${border} p-4 bg-white shadow-sm transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${primary} flex items-center gap-1.5`}>
          <span>☔ Alarma de Lluvia</span>
        </h3>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${levelBadges[radar.level]}`}>
          {radar.level}
        </span>
      </div>

      <div className={`rounded-lg border p-3 text-xs mb-3 ${levelColors[radar.level]}`}>
        <p className="font-medium">{radar.message}</p>
        {radar.minutesToRain !== null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-bold text-red-600 animate-pulse">
              Inicio estimado: en {radar.minutesToRain} minutos
            </span>
          </div>
        )}
      </div>

      {radar.radarImageUrl ? (
        <div>
          <button
            onClick={() => setShowRadarMap(!showRadarMap)}
            className={`w-full text-center text-xs font-semibold py-2 px-4 rounded-lg border transition-all ${
              showRadarMap
                ? 'bg-slate-800 text-white border-slate-800'
                : isAyto
                ? 'bg-[#1B3668]/10 text-[#1B3668] border-[#1B3668]/20 hover:bg-[#1B3668]/20'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            {showRadarMap ? 'Ocultar Radar Regional' : 'Ver Radar Regional AEMET'}
          </button>
          
          {showRadarMap && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 relative">
              <img
                src={radar.radarImageUrl}
                alt="Radar regional AEMET"
                className="w-full h-auto object-cover max-h-72"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div className="absolute bottom-2 right-2 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded">
                Radar AEMET Almería
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 text-center italic">Radar de AEMET no disponible temporalmente</p>
      )}
    </div>
  );
}
