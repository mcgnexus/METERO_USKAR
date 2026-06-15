'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RadarData } from '@/types/weather';

/* ── Coordenadas de Huéscar ── */
const HUESCAR = { lat: 37.8094, lon: -2.5392 };

/* ── Bounding box aproximado del radar regional de AEMET (Almería/Granada) ──
   Ajusta estos valores si la imagen de AEMET cubre otra zona.               */
const BBOX = { minLon: -5.2, maxLon: -0.8, minLat: 36.0, maxLat: 40.5 };

function latLonToPercent(lat: number, lon: number) {
  const x = (lon - BBOX.minLon) / (BBOX.maxLon - BBOX.minLon);
  const y = 1 - (lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat);
  return { x, y };
}

const HUESCAR_PCT = latLonToPercent(HUESCAR.lat, HUESCAR.lon);

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.4;

/* ─────────────────────────────────────────────────────────────────────────── */

export default function RadarPanel({
  radar,
  variant = 'neutral',
}: {
  radar?: RadarData;
  variant?: 'neutral' | 'ayto';
}) {
  const [showRadarMap, setShowRadarMap] = useState(false);
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const containerRef    = useRef<HTMLDivElement>(null);
  const dragging        = useRef(false);
  const lastMouse       = useRef({ x: 0, y: 0 });
  const lastPinchDist   = useRef<number | null>(null);
  const scaleRef        = useRef(scale);
  const offsetRef       = useRef(offset);

  // Mantener refs sincronizados con el estado (para callbacks nativos sin stale closure)
  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  /* ── Clamp offset para no salir del área visible ── */
  const clampOffset = useCallback((ox: number, oy: number, s: number) => {
    const el = containerRef.current;
    if (!el) return { x: ox, y: oy };
    const maxX = (el.clientWidth  * (s - 1)) / 2;
    const maxY = (el.clientHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setScale(prev => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      setOffset(o => clampOffset(o.x, o.y, next));
      return next;
    });
  }, [clampOffset]);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  /* ── Listeners nativos con passive:false (wheel + touchmove) ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !showRadarMap) return;

    /* Wheel → zoom */
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setScale(prev => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
        setOffset(o => {
          const maxX = (el.clientWidth  * (next - 1)) / 2;
          const maxY = (el.clientHeight * (next - 1)) / 2;
          return {
            x: Math.max(-maxX, Math.min(maxX, o.x)),
            y: Math.max(-maxY, Math.min(maxY, o.y)),
          };
        });
        return next;
      });
    };

    /* TouchMove → pan + pinch */
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && dragging.current) {
        const dx = e.touches[0].clientX - lastMouse.current.x;
        const dy = e.touches[0].clientY - lastMouse.current.y;
        lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setOffset(o => {
          const s = scaleRef.current;
          const maxX = (el.clientWidth  * (s - 1)) / 2;
          const maxY = (el.clientHeight * (s - 1)) / 2;
          return {
            x: Math.max(-maxX, Math.min(maxX, o.x + dx)),
            y: Math.max(-maxY, Math.min(maxY, o.y + dy)),
          };
        });
      } else if (e.touches.length === 2 && lastPinchDist.current !== null) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX;
        const dy   = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / lastPinchDist.current;
        lastPinchDist.current = dist;
        setScale(prev => {
          const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * ratio));
          setOffset(o => {
            const maxX = (el.clientWidth  * (next - 1)) / 2;
            const maxY = (el.clientHeight * (next - 1)) / 2;
            return {
              x: Math.max(-maxX, Math.min(maxX, o.x)),
              y: Math.max(-maxY, Math.min(maxY, o.y)),
            };
          });
          return next;
        });
      }
    };

    el.addEventListener('wheel',      handleWheel,     { passive: false });
    el.addEventListener('touchmove',  handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('wheel',     handleWheel);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showRadarMap]); // re-registrar solo cuando el mapa se muestra/oculta

  /* ── Handlers de ratón (React JSX – no necesitan passive:false) ── */
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    setIsDragging(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setOffset(o => clampOffset(o.x + dx, o.y + dy, scaleRef.current));
  }, [clampOffset]);

  const onMouseUp = () => {
    dragging.current = false;
    setIsDragging(false);
  };

  /* ── Touch start / end (React JSX) ── */
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragging.current = true;
      lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      dragging.current = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
    lastPinchDist.current = null;
  };

  /* Reset al ocultar el mapa */
  useEffect(() => {
    if (!showRadarMap) {
      resetView();
      setImgError(null);
    }
  }, [showRadarMap, resetView]);

  /* ── Estilos ── */
  if (!radar) return null;

  const isAyto  = variant === 'ayto';
  const border  = isAyto ? 'border-[#e8e4d8]' : 'border-slate-200';
  const primary = isAyto ? 'text-[#1B3668]' : 'text-slate-800';

  const levelColors: Record<RadarData['level'], string> = {
    ninguno: 'text-green-700 bg-green-50 border-green-200',
    aviso:   'text-yellow-700 bg-yellow-50 border-yellow-200',
    alerta:  'text-orange-700 bg-orange-50 border-orange-200',
    peligro: 'text-red-700 bg-red-50 border-red-200',
  };

  const alarmIcons: Record<RadarData['level'], string> = {
    ninguno: '☔', aviso: '⚠️', alerta: '🌧️', peligro: '🌩️',
  };

  const levelBadges: Record<RadarData['level'], string> = {
    ninguno: 'bg-green-500 text-white',
    aviso:   'bg-yellow-500 text-black',
    alerta:  'bg-orange-500 text-white',
    peligro: 'bg-red-600 text-white',
  };

  const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`rounded-xl border ${border} p-4 bg-white shadow-sm transition-all duration-300`}>
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold ${primary} flex items-center gap-1.5`}>
          <span>Radar regional</span>
          {radar.level !== 'ninguno' && (
            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${levelColors[radar.level]}`}>
              {alarmIcons[radar.level]} Alarma de Lluvia
            </span>
          )}
        </h3>
        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${levelBadges[radar.level]}`}>
          {radar.level}
        </span>
      </div>

      {/* Mensaje de estado */}
      <div className={`rounded-lg border p-3 text-xs mb-3 ${levelColors[radar.level]}`}>
        <p className="font-medium">{radar.message}</p>
        {radar.minutesToRain !== null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="font-bold text-red-600 animate-pulse">
              Inicio estimado: en {radar.minutesToRain} minutos
            </span>
          </div>
        )}
      </div>

      {/* Radar interactivo */}
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
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-900 overflow-hidden select-none">
            {/* Barra de controles */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-white text-[11px]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeZoom(ZOOM_STEP)}
                  className="w-6 h-6 rounded bg-slate-600 hover:bg-slate-500 flex items-center justify-center font-bold text-sm leading-none"
                  title="Ampliar"
                >+</button>
                <button
                  onClick={() => changeZoom(-ZOOM_STEP)}
                  className="w-6 h-6 rounded bg-slate-600 hover:bg-slate-500 flex items-center justify-center font-bold text-sm leading-none"
                  title="Reducir"
                >−</button>
                <button
                  onClick={resetView}
                  className="px-2 h-6 rounded bg-slate-600 hover:bg-slate-500 text-[10px] font-semibold"
                  title="Restablecer vista"
                >↺ Reset</button>
                <span className="text-slate-400">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>📍 Huéscar</span>
                <span>🕐 {now}</span>
              </div>
            </div>

            {/* Contenedor del mapa — wheel y touchmove se registran via useEffect */}
            <div
              ref={containerRef}
              className="relative overflow-hidden bg-slate-900"
              style={{ height: '300px', cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Capa transformada (imagen + marcador) */}
              <div
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.12s ease',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={radar.radarImageUrl}
                  alt="Radar regional AEMET"
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: imgError ? 'none' : 'block' }}
                  onError={() => setImgError('El radar de AEMET no está disponible ahora mismo (límite de peticiones). Inténtalo en 1 minuto.')}
                  onLoad={() => setImgError(null)}
                />
                {imgError && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(15,23,42,0.85)', color: '#94a3b8',
                    fontSize: '11px', textAlign: 'center', padding: '16px',
                    gap: '8px',
                  }}>
                    <span style={{ fontSize: '28px' }}>🛰️</span>
                    <span>{imgError}</span>
                    <button
                      onClick={() => { setImgError(null); }}
                      style={{
                        marginTop: '4px', fontSize: '10px', fontWeight: 700,
                        padding: '4px 10px', borderRadius: '6px',
                        background: '#334155', color: '#e2e8f0', border: 'none', cursor: 'pointer',
                      }}
                    >
                      🔄 Reintentar
                    </button>
                  </div>
                )}

                {/* Marcador Huéscar */}
                <div
                  style={{
                    position: 'absolute',
                    left: `${HUESCAR_PCT.x * 100}%`,
                    top: `${HUESCAR_PCT.y * 100}%`,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      background: '#1B3668',
                      color: 'white',
                      fontSize: '9px',
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '4px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                      marginBottom: '2px',
                    }}>
                      📍 Huéscar
                    </div>
                    <div style={{
                      width: 0, height: 0,
                      borderLeft:  '5px solid transparent',
                      borderRight: '5px solid transparent',
                      borderTop:   '7px solid #1B3668',
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pie del mapa */}
            <div className="flex items-center justify-between px-3 py-1 bg-slate-800 text-[9px] text-slate-400">
              <span>Radar AEMET · Almería/Granada</span>
              <span>Actualizado: {now}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
