'use client';

import { useState } from 'react';
import type { WeatherPayload, SourceObservation } from '@/types/weather';
import { confidenceExplanation, confidenceHeadline } from '@/components/motor/quality-language';

interface Props {
  data: WeatherPayload;
  variant?: 'neutral' | 'ayto';
  onDark?: boolean;
}

function sourceLabel(source: SourceObservation): string {
  if (source.source === 'AEMET') return 'AEMET 5051X';
  if (source.source === 'LOCAL_STATIONS') return `Miniestación ${source.stationId ?? ''}`;
  if (source.source === 'OPEN_METEO') return 'Open-Meteo';
  return source.source;
}

function qualityDot(score: number): { color: string; label: string } {
  if (score >= 0.7) return { color: 'bg-green-500', label: 'Alta' };
  if (score >= 0.4) return { color: 'bg-amber-500', label: 'Media' };
  return { color: 'bg-red-500', label: 'Baja' };
}

export default function ModelTransparencyPanel({ data, variant = 'neutral', onDark = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isAyto = variant === 'ayto';
  const accent = onDark ? 'text-slate-100' : isAyto ? 'text-[#1B3668]' : 'text-slate-700';
  const subText = onDark ? 'text-slate-300' : 'text-slate-500';
  const hasLocalSensor = data.sources.some((source) => source.source === 'LOCAL_STATIONS' && source.status === 'OK');

  const hasOro = data.orographic && data.orographic.factor !== 1.0;
  const hasReservoir = data.sources.some(
    (s) => s.source === 'AEMET' && s.rawTemperatureC !== undefined && s.altitudeCorrectionC !== undefined
  );

  return (
    <div className="mt-2 space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 text-[11px] font-medium ${accent} hover:opacity-70 transition-opacity`}
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span>Transparencia del modelo</span>
        <span className={`text-[10px] ${subText}`}>
          ({data.sources.length} fuentes · {confidenceHeadline(data.confidencePct).toLowerCase()} · {data.confidencePct.toFixed(0)}%)
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white/95 p-3 text-xs text-slate-700 shadow-sm">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
            <p className="font-bold text-slate-800">Lectura rápida</p>
            <p className="mt-1">{confidenceHeadline(data.confidencePct)}. {confidenceExplanation(data.confidencePct, hasLocalSensor)}</p>
          </div>
          {data.sources.map((source) => {
            const qd = qualityDot(source.qualityScore);
            const ageMin = source.dataAgeMinutes;
            return (
              <div key={`${source.source}-${source.stationId ?? source.locationName}`} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${qd.color}`} />
                  <span className="font-semibold text-slate-700">{sourceLabel(source)}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500">{qd.label}</span>
                  {ageMin > 0 && (
                    <>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">hace {Math.round(ageMin)} min</span>
                    </>
                  )}
                  {source.retrievalStatus && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {source.retrievalStatus === 'LIVE' ? 'En vivo' : source.retrievalStatus === 'FRESH_CACHE' ? 'Cache fresco' : 'Cache'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-4 text-[11px] text-slate-500">
                  {source.rawTemperatureC !== undefined && (
                    <span>
                      Temp. bruta: <span className="font-medium text-slate-600">{source.rawTemperatureC.toFixed(1)}°C</span>
                    </span>
                  )}
                  {source.distanceToTargetKm !== undefined && (
                    <span>distancia: {source.distanceToTargetKm.toFixed(1)} km</span>
                  )}
                  {source.elevationM !== undefined && source.targetElevationM !== undefined && (
                    <span>cota: {source.elevationM.toFixed(0)}→{source.targetElevationM.toFixed(0)} m</span>
                  )}
                  {source.altitudeCorrectionC !== undefined && (
                    <span>
                      corrección: <span className={source.altitudeCorrectionC >= 0 ? 'text-orange-600' : 'text-blue-600'}>
                        {source.altitudeCorrectionC >= 0 ? '+' : ''}{source.altitudeCorrectionC.toFixed(2)}°C
                      </span>
                    </span>
                  )}
                  {source.distanceWeightFactor !== undefined && (
                    <span>peso: {(source.distanceWeightFactor * 100).toFixed(0)}%</span>
                  )}
                  {source.temperatureC !== undefined && source.rawTemperatureC !== undefined && (
                    <span>
                      → <span className="font-semibold text-slate-700">{source.temperatureC.toFixed(1)}°C</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {hasReservoir && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-blue-500">💧</span>
              <span className="text-slate-600">
                Corrección por Pantano de San Clemente (~278 m de AEMET 5051X): retira enfriamiento y exceso de humedad
              </span>
            </div>
          )}

          {hasOro && data.orographic && (
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <span>🏔️</span>
              <span className="text-slate-600">
                Orográfico: <span className="font-medium capitalize">{data.orographic.classification}</span>
                {' '}(factor ×{data.orographic.factor.toFixed(2)}) — {data.orographic.description}
              </span>
            </div>
          )}

          {data.confidenceExplanation && (
            <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
              <span className="text-slate-400">📊</span>
              <div>
                <span className="text-slate-600">Confianza: </span>
                <span className="font-semibold" style={{ color: data.confidencePct >= 70 ? '#16a34a' : data.confidencePct >= 50 ? '#ca8a04' : '#dc2626' }}>
                  {data.confidencePct.toFixed(0)}%
                </span>
                <span className="text-slate-500"> — {data.confidenceExplanation}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
