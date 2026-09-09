'use client';

import { useCallback, useState } from 'react';
import { useApiData } from '@/hooks/useApiData';

interface FunnelStep {
  key: string;
  label: string;
  emoji: string;
  count: number;
  conversionPct: number;
}

interface FunnelReport {
  daysBack: number;
  municipality: string | null;
  utmCampaign: string | null;
  steps: FunnelStep[];
  municipalities: string[];
  campaigns: string[];
  hasData: boolean;
}

const DAY_OPTIONS = [
  { value: 7, label: '7 días' },
  { value: 14, label: '14 días' },
  { value: 30, label: '30 días' },
  { value: 60, label: '60 días' },
  { value: 90, label: '90 días' },
];

function pct(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function FunnelPanel() {
  const [days, setDays] = useState(30);
  const [municipality, setMunicipality] = useState<string>('');
  const [campaign, setCampaign] = useState<string>('');

  const url = `/api/admin/funnel?days=${days}${municipality ? `&municipality=${encodeURIComponent(municipality)}` : ''}${campaign ? `&utm=${encodeURIComponent(campaign)}` : ''}`;
  const { data, loading, refresh } = useApiData<{ report: FunnelReport }>(url, `admin-funnel-${days}-${municipality}-${campaign}`);

  const applyDays = useCallback((value: number) => {
    setDays(value);
    refresh();
  }, [refresh]);
  const applyMunicipality = useCallback((value: string) => {
    setMunicipality(value);
    refresh();
  }, [refresh]);
  const applyCampaign = useCallback((value: string) => {
    setCampaign(value);
    refresh();
  }, [refresh]);
  const clearFilters = useCallback(() => {
    setMunicipality('');
    setCampaign('');
    refresh();
  }, [refresh]);

  const report = data?.report ?? null;
  const maxCount = Math.max(1, report?.steps[0]?.count ?? 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs text-slate-400">
          Ventana
          <select
            value={days}
            onChange={(e) => applyDays(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          >
            {DAY_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Municipio
          <select
            value={municipality}
            onChange={(e) => applyMunicipality(e.target.value)}
            className="mt-1 block w-full min-w-[140px] rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="">Todos</option>
            {(report?.municipalities ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="block text-xs text-slate-400">
          Campaña (UTM)
          <select
            value={campaign}
            onChange={(e) => applyCampaign(e.target.value)}
            className="mt-1 block w-full min-w-[140px] rounded-lg border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="">Todas</option>
            {(report?.campaigns ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        {(municipality || campaign) && (
          <button
            onClick={clearFilters}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando embudo…</p>}

      {!loading && report && !report.hasData && (
        <p className="text-sm text-slate-500">Sin datos de conversión en el período y filtros seleccionados.</p>
      )}

      {!loading && report && report.hasData && (
        <div className="space-y-3">
          {report.steps.map((step, index) => (
            <div key={step.key} className="flex items-center gap-3">
              <span className="w-7 text-center text-lg" aria-hidden="true">{step.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-200">
                    {step.label}
                    {index > 0 && (
                      <span className={`ml-2 font-bold ${step.conversionPct >= 50 ? 'text-emerald-400' : step.conversionPct >= 20 ? 'text-amber-300' : 'text-red-400'}`}>
                        ↓ {pct(step.conversionPct)}
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-bold tabular-nums text-slate-100">{step.count}</p>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-2 rounded-full ${step.key === 'lead_valid' || step.key === 'responded' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    style={{ width: `${Math.max(0.5, (step.count / maxCount) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] leading-4 text-slate-600">
        Visita = vistas de página · CTA = clicks de captación (lead_cta_click / cta_clicked) · Form iniciado =
        lead_form_start(+ed legacy) · Form completado = submit · Lead válido = éxito en BD (eventos + leads
        guardados) · WhatsApp = whatsapp_click(+ed) · Respuesta = lead marcado como respondido desde este panel.
        Tasas = paso / paso anterior (el primero = 100%). Eventos canónicos y legacy se unifican en cada paso.
        Fuentes desactualizadas o ausentes no se muestran como actuales.
      </p>
    </div>
  );
}