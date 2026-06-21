'use client';

import { OverviewMetric } from '@/components/dashboard/atoms';
import { frostRiskLabel } from '@/lib/display';
import type { AgriculturalData, LightningData, LivestockData } from '@/types/weather';

function LightningPanel({ lightning }: { lightning: LightningData }) {
  const levelColors: Record<string, string> = {
    info: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    precaucion: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    alerta: 'text-orange-700 bg-orange-50 border-orange-200',
    peligro: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className={`rounded-[22px] border p-4 ${levelColors[lightning.level] ?? 'bg-slate-50'}`}>
      <h3 className="text-base font-bold">Actividad electrica</h3>
      <p className="mt-2 text-sm">{lightning.message}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/70 p-3">
          <p className="text-xs uppercase tracking-[0.18em]">Rayos detectados</p>
          <p className="mt-1 text-xl font-bold">{lightning.strikeCount}</p>
        </div>
        {lightning.nearestStrikeKm !== null && (
          <div className="rounded-2xl bg-white/70 p-3">
            <p className="text-xs uppercase tracking-[0.18em]">Rayo mas cercano</p>
            <p className="mt-1 text-xl font-bold">{lightning.nearestStrikeKm.toFixed(1)} km</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AgriculturalSection({ agri }: { agri: AgriculturalData }) {
  const pestRiskColors = {
    bajo: 'text-green-700 bg-green-50',
    medio: 'text-amber-700 bg-amber-50',
    alto: 'text-red-700 bg-red-50',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa operativa</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Asesoria agricola</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${agri.workability.workable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {agri.workability.workable ? 'Suelo operable' : 'Labores no recomendadas'}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewMetric label="ET0" value={`${agri.et0CumulativeMm.toFixed(1)} mm`} caption="Evapotranspiracion acumulada" />
        <OverviewMetric label="GDD" value={`${agri.gddCumulative.toFixed(0)}`} caption="Grados dia estimados" />
        <OverviewMetric label="Frio" value={`${agri.chillHours.toFixed(0)} h`} caption="Horas frio semanales" />
        <OverviewMetric
          label="Helada 48h"
          value={frostRiskLabel(agri.frostRisk48h)}
          caption="Riesgo microclimatico local"
          tone={agri.frostRisk48h === 'alta' || agri.frostRisk48h === 'muy_alta' ? 'warning' : 'default'}
        />
      </div>

      {(agri.recommendedIrrigationLitersM2 !== undefined || agri.pestRisk) && (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {agri.recommendedIrrigationLitersM2 !== undefined && (
            <div className="rounded-[20px] border border-sky-100 bg-sky-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Riego recomendado</p>
              <p className="mt-2 text-2xl font-bold text-sky-900">{agri.recommendedIrrigationLitersM2.toFixed(1)} l/m²</p>
              <p className="mt-1 text-sm text-sky-800">Balance semanal para cultivos de la zona.</p>
            </div>
          )}
          {agri.pestRisk && (
            <div className="rounded-[20px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Plagas comarcales</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-slate-600">Repilo</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pestRiskColors[agri.pestRisk.repiloRisk]}`}>
                  {agri.pestRisk.repiloRisk}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Mosca del olivo</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pestRiskColors[agri.pestRisk.oliveFlyRisk]}`}>
                  {agri.pestRisk.oliveFlyRisk}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {agri.workability.reasons.length > 0 && (
        <div className="mt-4 rounded-[20px] border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Motivos operativos</p>
          <ul className="mt-2 space-y-1">
            {agri.workability.reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LivestockSection({ livestock }: { livestock: LivestockData }) {
  const levelColors: Record<string, string> = {
    ninguno: 'bg-emerald-50 text-emerald-700',
    leve: 'bg-yellow-50 text-yellow-700',
    moderado: 'bg-orange-50 text-orange-700',
    severo: 'bg-red-50 text-red-700',
    peligroso: 'bg-red-100 text-red-800',
  };

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Capa operativa</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Estres termico ganadero</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${levelColors[livestock.level] ?? 'bg-slate-100 text-slate-700'}`}>
          {livestock.level}
        </span>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <OverviewMetric label="Indice ITH" value={livestock.thi.toFixed(1)} caption="Valor sintetico actual" />
        <OverviewMetric label="Impacto" value={livestock.affectedLivestock} caption="Perfil mas afectado" />
      </div>
    </div>
  );
}

export { LightningPanel, AgriculturalSection, LivestockSection };
