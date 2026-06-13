'use client';

import { useState, useEffect, useCallback } from 'react';
import WeatherStationPanel from '@/components/WeatherStationPanel';

interface SourceHealthStatus {
  source: string;
  status: 'OK' | 'DEGRADED' | 'ERROR';
  checkedAt: string;
  dataAgeMinutes?: number;
  lastError?: string;
  message: string;
}

interface CacheEntryStatus {
  key: string;
  ageMs: number;
  ttlMs: number;
  stale: boolean;
}

interface AdminOverview {
  sourceHealth: SourceHealthStatus[];
  cacheEntries: CacheEntryStatus[];
  calibrationMetrics: Record<string, number>;
  uptime: string;
}

function StatusCard({ health }: { health: SourceHealthStatus }) {
  const colors: Record<string, string> = {
    OK: 'border-green-700 bg-green-900/20',
    DEGRADED: 'border-amber-700 bg-amber-900/20',
    ERROR: 'border-red-700 bg-red-900/20',
  };
  const dotColors: Record<string, string> = {
    OK: 'bg-green-500',
    DEGRADED: 'bg-amber-500',
    ERROR: 'bg-red-500',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[health.status] ?? 'border-slate-700 bg-slate-800'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-block w-3 h-3 rounded-full ${dotColors[health.status] ?? 'bg-slate-500'}`} />
        <h3 className="font-semibold text-sm">{health.source}</h3>
      </div>
      <p className="text-xs text-slate-400 mb-1">{health.message}</p>
      {health.dataAgeMinutes !== undefined && (
        <p className="text-xs text-slate-500">Antigüedad: {health.dataAgeMinutes.toFixed(0)} min</p>
      )}
      {health.lastError && (
        <p className="text-xs text-red-400 mt-1">Error: {health.lastError}</p>
      )}
      <p className="text-xs text-slate-600 mt-1">Verificado: {new Date(health.checkedAt).toLocaleString('es-ES')}</p>
    </div>
  );
}

export default function AdminConsole() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/overview', { cache: 'no-store' });
      if (res.ok) {
        const json: AdminOverview = await res.json();
        setOverview(json);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  async function handleForceRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetch('/api/admin/force-refresh', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo forzar la actualización.');
      await fetchOverview();
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'No se pudo forzar la actualización.');
    } finally {
      setRefreshing(false);
      setConfirmRefresh(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center p-20 text-slate-400">
        No se pudieron cargar los datos de administración.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Force refresh */}
      <div className="flex justify-end">
        {confirmRefresh ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-400">¿Forzar actualización?</span>
            <button
              onClick={handleForceRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {refreshing ? 'Actualizando...' : 'Sí, forzar'}
            </button>
            <button
              onClick={() => setConfirmRefresh(false)}
              className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRefresh(true)}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
          >
            Forzar actualización
          </button>
        )}
      </div>
      {refreshError && <p className="text-sm text-red-400 text-right">{refreshError}</p>}

      {/* Source Health */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Estado de Fuentes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview.sourceHealth.map((h, i) => (
            <StatusCard key={i} health={h} />
          ))}
        </div>
      </section>

      {/* Cache Status */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Estado de Caché</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="text-left px-3 py-2">Clave</th>
                <th className="text-right px-3 py-2">Edad</th>
                <th className="text-right px-3 py-2">TTL</th>
                <th className="text-center px-3 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {overview.cacheEntries.map((entry, i) => (
                <tr key={i} className="border-b border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs">{entry.key}</td>
                  <td className="text-right px-3 py-2">{(entry.ageMs / 1000).toFixed(0)}s</td>
                  <td className="text-right px-3 py-2">{(entry.ttlMs / 1000).toFixed(0)}s</td>
                  <td className="text-center px-3 py-2">
                    <span className={`text-xs font-medium ${entry.stale ? 'text-red-400' : 'text-green-400'}`}>
                      {entry.stale ? 'Stale' : 'Fresh'}
                    </span>
                  </td>
                </tr>
              ))}
              {overview.cacheEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-4 text-slate-500">Sin entradas en caché</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Calibration Metrics */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Métricas de Calibración</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Object.entries(overview.calibrationMetrics).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="text-xs text-slate-400 mb-1">{key}</p>
              <p className="text-xl font-bold text-slate-100">{typeof value === 'number' ? value.toFixed(2) : value}</p>
            </div>
          ))}
          {Object.keys(overview.calibrationMetrics).length === 0 && (
            <p className="text-slate-500 text-sm col-span-full">Sin métricas disponibles</p>
          )}
        </div>
      </section>

      {/* Miniestaciones Locales para Admin (con visibilidad completa) */}
      <section className="bg-slate-900 border border-slate-700 rounded-xl p-4 text-slate-100">
        <WeatherStationPanel />
      </section>

      {/* Uptime */}
      {overview.uptime && (
        <div className="text-xs text-slate-600 text-right">
          Uptime: {overview.uptime}
        </div>
      )}
    </div>
  );
}
