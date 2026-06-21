'use client';

import { fmtNumber, KpiCard, StatusBadge } from '@/components/motor/atoms';
import type { ClimateCalibrationPayload, ClimateNode } from '@/types/climate';

function sourceLabel(source: string): string {
  if (source === 'OPEN_METEO') return 'fallback Open-Meteo';
  if (source === 'LOCAL_STATION') return 'sensor propio';
  return 'observación oficial';
}

function ageMinutes(time: string): number | null {
  const ms = Date.now() - new Date(time).getTime();
  return Number.isFinite(ms) ? Math.round(ms / 60000) : null;
}

function NodeRow({ label, node }: { label: string; node: ClimateNode & { role?: string } }) {
  const age = ageMinutes(node.time);
  return (
    <div className="rounded-[22px] border border-slate-100 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-black text-slate-950">{label}</p>
          <p className="text-xs text-slate-500">
            {node.elevationM.toFixed(0)} m · {sourceLabel(node.source)}
            {age !== null && age >= 0 && ` · hace ${age < 60 ? `${age} min` : `${Math.floor(age / 60)}h ${age % 60}min`}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-black text-slate-950">
            {fmtNumber(node.temperatureC, 1)}°C
          </p>
          <StatusBadge status={node.status} />
        </div>
      </div>
      {node.humidityPct !== null && (
        <p className="mt-2 text-xs text-slate-500">
          HR {fmtNumber(node.humidityPct, 0)}%
          {node.pressureHPa != null && ` · P ${fmtNumber(node.pressureHPa, 0)} hPa`}
        </p>
      )}
    </div>
  );
}

export function ContrastPanel({ data }: { data: ClimateCalibrationPayload }) {
  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">Panel de contraste</p>
      <h2 className="mt-1 text-2xl font-black text-slate-950">La prueba del delito orográfico</h2>
      <div className="mt-5 space-y-3">
        <NodeRow label="AEMET Baza" node={data.nodes.baza} />
        <NodeRow label="AEMET San Clemente" node={data.nodes.sanClemente} />
        <NodeRow
          label="Huéscar Llano"
          node={{
            ...(data.nodes.localStation ?? {
              source: 'LOCAL_STATION',
              stationId: 'llano_huescar',
              name: 'Llano (estimado)',
              time: data.generatedAt,
              temperatureC: data.calibration.realTemperatureC,
              humidityPct: null,
              pressureHPa: null,
              elevationM: data.location.elevation,
              status: data.calibration.realTemperatureC !== null ? 'OK' : 'FALLBACK',
            }),
            elevationM: data.nodes.localStation?.elevationM ?? data.location.elevation,
          }}
        />
      </div>
      <div className={`mt-5 rounded-[22px] p-4 ${data.interpolation.inversionDetected ? 'bg-orange-50 text-orange-950' : 'bg-emerald-50 text-emerald-950'}`}>
        <p className="font-black">
          {data.interpolation.inversionDetected ? 'Inversión térmica detectada' : 'Gradiente térmico normal'}
        </p>
        <p className="mt-1 text-sm leading-6">
          {data.interpolation.inversionDetected
            ? 'El aire frío está estancado en la vega. El llano puede estar más frío que estaciones oficiales elevadas.'
            : 'La temperatura desciende con la altitud dentro del comportamiento esperado.'}
        </p>
        <p className="mt-2 font-mono text-xs opacity-80">{data.interpolation.formula}</p>
      </div>
    </section>
  );
}

export function AuditHero({ data, chillHours, chillHoursYearly, rainNext5d, foehnFactor }: {
  data: ClimateCalibrationPayload;
  chillHours: number | null;
  chillHoursYearly: number | null;
  rainNext5d: number | null;
  foehnFactor: number;
}) {
  const currentTemp = data.calibration.realTemperatureC ?? data.interpolation.estimatedTemperatureC;
  const residual = data.calibration.residualC;
  const residualTone = residual === null
    ? 'default'
    : Math.abs(residual) < 1
      ? 'success'
      : Math.abs(residual) < 2.5
        ? 'warning'
        : 'danger';
  const residualSign = residual !== null && residual > 0 ? 'sobreestima' : residual !== null && residual < 0 ? 'subestima' : 'sin auditoría';

  return (
    <section className="surface-card-strong rounded-[32px] p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-sky-700">El Motor Climático</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-5xl">Transparencia científica del llano</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Contraste entre estaciones oficiales, interpolación física, auditoría contra sensor propio y métricas agronómicas.
          </p>
        </div>
        <a href="/llano" className="cta-primary">Ver Pulso del Llano</a>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Temperatura estimada"
          value={fmtNumber(currentTemp, 1)}
          unit="°C"
          caption={`Interpolación a ${data.location.elevation} m`}
          tone="accent"
        />
        <KpiCard
          label="Residual del modelo"
          value={residual !== null ? `${residual > 0 ? '+' : ''}${residual.toFixed(1)}` : '—'}
          unit="°C"
          caption={residualTone === 'default' ? 'Sin sensor local activo' : `El modelo ${residualSign}`}
          tone={residualTone}
        />
        <KpiCard
          label="Horas-frío 7d"
          value={chillHours !== null ? chillHours.toString() : '—'}
          unit="h"
          caption={chillHoursYearly !== null ? `Acumulado estacional: ${chillHoursYearly} h` : 'Pronóstico semanal'}
        />
        <KpiCard
          label="Lluvia 5d"
          value={rainNext5d !== null ? rainNext5d.toFixed(1) : '—'}
          unit="mm"
          caption={`Foehn actual × ${foehnFactor.toFixed(2)} (llano recibe ${Math.round(foehnFactor * 100)}% de San Clemente)`}
        />
      </div>
    </section>
  );
}
