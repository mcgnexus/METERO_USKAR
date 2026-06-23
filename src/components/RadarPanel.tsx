'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { RadarData } from '@/types/weather';

const HUESCAR = { lat: 37.809444, lon: -2.539444 };
const BBOX = { minLon: -5.2, maxLon: -0.8, minLat: 36.0, maxLat: 40.5 };
const BBOX_WIDTH = BBOX.maxLon - BBOX.minLon;
const BBOX_HEIGHT = BBOX.maxLat - BBOX.minLat;
const BBOX_ASPECT = BBOX_WIDTH / BBOX_HEIGHT;

function latLonToPercent(lat: number, lon: number) {
  const x = (lon - BBOX.minLon) / (BBOX.maxLon - BBOX.minLon);
  const y = 1 - (lat - BBOX.minLat) / (BBOX.maxLat - BBOX.minLat);
  return { x, y };
}

const HUESCAR_PCT = latLonToPercent(HUESCAR.lat, HUESCAR.lon);

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 0.4;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function timeAgo(isoString: string, nowMs: number): string {
  const diffMin = Math.floor((nowMs - new Date(isoString).getTime()) / 60000);
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  return `Hace ${Math.floor(diffMin / 60)} h`;
}

export default function RadarPanel({
  radar,
  variant = 'neutral',
}: {
  radar?: RadarData;
  variant?: 'neutral' | 'ayto';
}) {
  const [showRadarMap, setShowRadarMap] = useState(false);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [nowMs] = useState(() => Date.now());

  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef<number | null>(null);
  const scaleRef = useRef(scale);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  const clampOffset = useCallback((ox: number, oy: number, s: number) => {
    const element = containerRef.current;
    if (!element) return { x: ox, y: oy };
    const maxX = (element.clientWidth * (s - 1)) / 2;
    const maxY = (element.clientHeight * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  const changeZoom = useCallback((delta: number) => {
    setScale((prev) => {
      const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
      setOffset((current) => clampOffset(current.x, current.y, next));
      return next;
    });
  }, [clampOffset]);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const openRadarMap = useCallback(() => {
    setImgError(null);
    setIsLoading(true);
    setShowRadarMap(true);
  }, []);

  const closeRadarMap = useCallback(() => {
    dragging.current = false;
    lastPinchDist.current = null;
    setIsDragging(false);
    setShowRadarMap(false);
    resetView();
    setImgError(null);
    setIsLoading(false);
  }, [resetView]);

  const toggleRadarMap = useCallback(() => {
    if (showRadarMap) {
      closeRadarMap();
      return;
    }
    openRadarMap();
  }, [closeRadarMap, openRadarMap, showRadarMap]);

  useEffect(() => {
    if (!showRadarMap) return;
    const interval = setInterval(() => setRefreshKey((key) => key + 1), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [showRadarMap]);

  useEffect(() => {
    if (!showRadarMap) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === '+' || event.key === '=') { event.preventDefault(); changeZoom(ZOOM_STEP); }
      if (event.key === '-') { event.preventDefault(); changeZoom(-ZOOM_STEP); }
      if (event.key === '0') { event.preventDefault(); resetView(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showRadarMap, changeZoom, resetView]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || !showRadarMap) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      setScale((prev) => {
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev + delta));
        setOffset((current) => {
          const maxX = (element.clientWidth * (next - 1)) / 2;
          const maxY = (element.clientHeight * (next - 1)) / 2;
          return {
            x: Math.max(-maxX, Math.min(maxX, current.x)),
            y: Math.max(-maxY, Math.min(maxY, current.y)),
          };
        });
        return next;
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      event.preventDefault();
      if (event.touches.length === 1 && dragging.current) {
        const dx = event.touches[0].clientX - lastMouse.current.x;
        const dy = event.touches[0].clientY - lastMouse.current.y;
        lastMouse.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        setOffset((current) => {
          const currentScale = scaleRef.current;
          const maxX = (element.clientWidth * (currentScale - 1)) / 2;
          const maxY = (element.clientHeight * (currentScale - 1)) / 2;
          return {
            x: Math.max(-maxX, Math.min(maxX, current.x + dx)),
            y: Math.max(-maxY, Math.min(maxY, current.y + dy)),
          };
        });
      } else if (event.touches.length === 2 && lastPinchDist.current !== null) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const ratio = distance / lastPinchDist.current;
        lastPinchDist.current = distance;
        setScale((prev) => {
          const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * ratio));
          setOffset((current) => {
            const maxX = (element.clientWidth * (next - 1)) / 2;
            const maxY = (element.clientHeight * (next - 1)) / 2;
            return {
              x: Math.max(-maxX, Math.min(maxX, current.x)),
              y: Math.max(-maxY, Math.min(maxY, current.y)),
            };
          });
          return next;
        });
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('touchmove', handleTouchMove);
    };
  }, [showRadarMap]);

  const onMouseDown = (event: React.MouseEvent) => {
    dragging.current = true;
    setIsDragging(true);
    lastMouse.current = { x: event.clientX, y: event.clientY };
  };

  const onMouseMove = useCallback((event: React.MouseEvent) => {
    if (!dragging.current) return;
    const dx = event.clientX - lastMouse.current.x;
    const dy = event.clientY - lastMouse.current.y;
    lastMouse.current = { x: event.clientX, y: event.clientY };
    setOffset((current) => clampOffset(current.x + dx, current.y + dy, scaleRef.current));
  }, [clampOffset]);

  const onMouseUp = () => {
    dragging.current = false;
    setIsDragging(false);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      dragging.current = true;
      lastMouse.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if (event.touches.length === 2) {
      dragging.current = false;
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchEnd = () => {
    dragging.current = false;
    lastPinchDist.current = null;
  };

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

  const alarmIcons: Record<RadarData['level'], string> = {
    ninguno: 'â˜”', aviso: 'âš ï¸', alerta: 'ðŸŒ§ï¸', peligro: 'ðŸŒ©ï¸',
  };

  const levelBadges: Record<RadarData['level'], string> = {
    ninguno: 'bg-green-500 text-white',
    aviso: 'bg-yellow-500 text-black',
    alerta: 'bg-orange-600 text-white',
    peligro: 'bg-red-600 text-white',
  };

  return (
    <div className={`rounded-xl border ${border} bg-white p-4 shadow-sm transition-all duration-300`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`flex items-center gap-1.5 font-semibold ${primary}`}>
          <span>Radar regional</span>
          {radar.level !== 'ninguno' && (
            <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${levelColors[radar.level]}`}>
              {alarmIcons[radar.level]} Alarma de Lluvia
            </span>
          )}
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${levelBadges[radar.level]}`}>
          {radar.level}
        </span>
      </div>

      <div className={`mb-3 rounded-lg border p-3 text-xs ${levelColors[radar.level]}`}>
        <p className="font-medium">{radar.message}</p>
        {radar.minutesToRain !== null && (
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="animate-pulse font-bold text-red-600">
              Inicio estimado: en {radar.minutesToRain} minutos
            </span>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={toggleRadarMap}
          className={`w-full rounded-lg border px-4 py-2 text-center text-xs font-semibold transition-all ${
            showRadarMap
              ? 'border-slate-800 bg-slate-800 text-white'
              : isAyto
                ? 'border-[#1B3668]/20 bg-[#1B3668]/10 text-[#1B3668] hover:bg-[#1B3668]/20'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {showRadarMap ? 'Ocultar Radar Regional' : 'Ver Radar Regional AEMET'}
        </button>

        {showRadarMap && (
          <div className="mt-3 select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
            <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 text-[11px] text-white">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeZoom(ZOOM_STEP)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-slate-600 text-sm font-bold leading-none hover:bg-slate-500"
                  aria-label="Ampliar"
                  title="Ampliar (+)"
                >+</button>
                <button
                  type="button"
                  onClick={() => changeZoom(-ZOOM_STEP)}
                  className="flex h-6 w-6 items-center justify-center rounded bg-slate-600 text-sm font-bold leading-none hover:bg-slate-500"
                  aria-label="Reducir"
                  title="Reducir (-)"
                >âˆ’</button>
                <button
                  type="button"
                  onClick={resetView}
                  className="h-6 rounded bg-slate-600 px-2 text-[10px] font-semibold hover:bg-slate-500"
                  aria-label="Restablecer vista"
                  title="Restablecer vista (0)"
                >â†º Reset</button>
                <span className="text-slate-400">{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span>ðŸ“ HuÃ©scar</span>
                <span>ðŸ• {timeAgo(radar.lastUpdated, nowMs)}</span>
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative h-[300px] overflow-hidden bg-slate-900 sm:h-[400px] lg:h-[480px]"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="relative max-h-full max-w-full"
                    style={{ aspectRatio: `${BBOX_ASPECT}` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${radar.radarImageUrl}?t=${refreshKey}`}
                      alt="Radar regional AEMET"
                      draggable={false}
                      className="block h-full w-full"
                      style={{ objectFit: 'contain', display: imgError ? 'none' : 'block' }}
                      onError={() => {
                        setIsLoading(false);
                        setImgError('El radar de AEMET no estÃ¡ disponible ahora mismo (lÃ­mite de peticiones). IntÃ©ntalo en 1 minuto.');
                      }}
                      onLoad={() => {
                        setIsLoading(false);
                        setImgError(null);
                      }}
                    />
                    {imgError && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(15,23,42,0.85)',
                          color: '#94a3b8',
                          fontSize: '11px',
                          textAlign: 'center',
                          padding: '16px',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '28px' }}>ðŸ›°ï¸</span>
                        <span>{imgError}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setImgError(null);
                            setIsLoading(true);
                            setRefreshKey((key) => key + 1);
                          }}
                          style={{
                            marginTop: '4px',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: '#334155',
                            color: '#e2e8f0',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          ðŸ”„ Reintentar
                        </button>
                      </div>
                    )}

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
                        <div
                          style={{
                            background: '#1B3668',
                            color: 'white',
                            fontSize: '9px',
                            fontWeight: 700,
                            padding: '2px 5px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.6)',
                            marginBottom: '2px',
                          }}
                        >
                          ðŸ“ HuÃ©scar
                        </div>
                        <div
                          style={{
                            width: 0,
                            height: 0,
                            borderLeft: '5px solid transparent',
                            borderRight: '5px solid transparent',
                            borderTop: '7px solid #1B3668',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {isLoading && !imgError && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/80">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white" />
                  <span className="mt-3 text-sm font-medium text-white">Cargando imagen del radarâ€¦</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-slate-800 px-3 py-2 text-[10px] text-slate-300">
              <span className="mr-1 font-semibold text-slate-400">dBZ:</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-green-300" /><span>10</span></span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-green-500" /><span>20</span></span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-yellow-400" /><span>30</span></span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-orange-400" /><span>40</span></span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-orange-600" /><span>50</span></span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-red-600" /><span>60</span></span>
              <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-5 rounded-sm bg-pink-600" /><span>70</span></span>
              <span className="ml-1 flex items-center gap-1.5 text-slate-400">&gt; 75 = Granizo</span>
            </div>

            <div className="flex items-center justify-between bg-slate-800 px-3 py-1 text-[9px] text-slate-400">
              <span>Radar AEMET Â· AlmerÃ­a/Granada</span>
              <span>Fuente: Open-Meteo + AEMET</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
