'use client';

import { useState } from 'react';
import { useApiData } from '@/hooks/useApiData';
import WeatherStationPanel from '@/components/WeatherStationPanel';
import ZonePanel from '@/components/ZonePanel';

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
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-block h-3 w-3 rounded-full ${dotColors[health.status] ?? 'bg-slate-500'}`} />
        <h3 className="text-sm font-semibold">{health.source}</h3>
      </div>
      <p className="mb-1 text-xs text-slate-400">{health.message}</p>
      {health.dataAgeMinutes !== undefined && (
        <p className="text-xs text-slate-500">Antigüedad: {health.dataAgeMinutes.toFixed(0)} min</p>
      )}
      {health.lastError && (
        <p className="mt-1 text-xs text-red-400">Error: {health.lastError}</p>
      )}
      <p className="mt-1 text-xs text-slate-600">Verificado: {new Date(health.checkedAt).toLocaleString('es-ES')}</p>
    </div>
  );
}

export default function AdminConsole() {
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRefresh, setConfirmRefresh] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const { data: overview, loading, refresh } = useApiData<AdminOverview>('/api/admin/overview', 'admin-overview');

  async function handleForceRefresh() {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const response = await fetch('/api/admin/force-refresh', { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo forzar la actualización.');
      refresh();
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-20 text-center text-slate-400">
        No se pudieron cargar los datos de administración.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        {confirmRefresh ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-amber-400">¿Forzar actualización?</span>
            <button
              onClick={handleForceRefresh}
              disabled={refreshing}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {refreshing ? 'Actualizando...' : 'Sí, forzar'}
            </button>
            <button
              onClick={() => setConfirmRefresh(false)}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-600"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRefresh(true)}
            className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
          >
            Forzar actualización
          </button>
        )}
      </div>
      {refreshError && <p className="text-right text-sm text-red-400">{refreshError}</p>}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Estado de Fuentes</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {overview.sourceHealth.map((health, index) => (
            <StatusCard key={`${health.source}-${index}`} health={health} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Estado de Caché</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400">
                <th className="px-3 py-2 text-left">Clave</th>
                <th className="px-3 py-2 text-right">Edad</th>
                <th className="px-3 py-2 text-right">TTL</th>
                <th className="px-3 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {overview.cacheEntries.map((entry, index) => (
                <tr key={`${entry.key}-${index}`} className="border-b border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs">{entry.key}</td>
                  <td className="px-3 py-2 text-right">{(entry.ageMs / 1000).toFixed(0)}s</td>
                  <td className="px-3 py-2 text-right">{(entry.ttlMs / 1000).toFixed(0)}s</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-medium ${entry.stale ? 'text-red-400' : 'text-green-400'}`}>
                      {entry.stale ? 'Stale' : 'Fresh'}
                    </span>
                  </td>
                </tr>
              ))}
              {overview.cacheEntries.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">Sin entradas en caché</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Métricas de Calibración</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Object.entries(overview.calibrationMetrics).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
              <p className="mb-1 text-xs text-slate-400">{key}</p>
              <p className="text-xl font-bold text-slate-100">{value.toFixed(2)}</p>
            </div>
          ))}
          {Object.keys(overview.calibrationMetrics).length === 0 && (
            <p className="col-span-full text-sm text-slate-500">Sin métricas disponibles</p>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100">
        <WeatherStationPanel isAdmin />
      </section>

      <section>
        <ZonePanel variant="admin" />
      </section>

      {overview.uptime && (
        <div className="text-right text-xs text-slate-600">
          Uptime: {overview.uptime}
        </div>
      )}
    </div>
  );
}
