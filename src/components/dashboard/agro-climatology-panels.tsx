'use client';

import { useAgroClimatology } from '@/hooks/useAgroClimatology';
import { OverviewMetric } from '@/components/dashboard/atoms';
import type { DailyWeather } from '@/types/weather';

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function findNextFrost(daily: DailyWeather | null): { date: string | null; daysAway: number | null } {
  if (!daily || !daily.time?.length) return { date: null, daysAway: null };
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = 0; i < daily.time.length; i++) {
    const tmin = daily.temperatureMinC[i];
    if (typeof tmin === 'number' && tmin <= 0) {
      const d = new Date(daily.time[i]);
      const daysAway = Math.round((d.getTime() - now.getTime()) / 86400000);
      return { date: daily.time[i], daysAway };
    }
  }
  return { date: null, daysAway: null };
}

function FrostPanel({ daily }: { daily?: DailyWeather | null }) {
  const { data, loading, error } = useAgroClimatology();

  const nextFrost = findNextFrost(daily ?? null);

  if (loading) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-50" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Vigilancia de heladas</p>
        <p className="mt-2 text-sm text-slate-400">Datos no disponibles en este momento.</p>
      </div>
    );
  }

  const f = data.frost;
  const noFrost = f.daysSinceLastFrost === null || f.daysSinceLastFrost > 60;
  const frostNextDate = nextFrost.date;
  const frostDaysAway = nextFrost.daysAway;

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Vigilancia de heladas</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">🧊 Riesgo de helada</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${frostNextDate ? 'bg-rose-50 text-rose-700' : noFrost ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
          {frostNextDate ? `Helada en ${frostDaysAway}d` : noFrost ? 'Sin helada reciente' : `${f.daysSinceLastFrost}d sin helada`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
        <OverviewMetric
          label="Ultima helada"
          value={fmtDate(f.lastFrostDate)}
          caption={f.daysSinceLastFrost !== null ? `Hace ${f.daysSinceLastFrost} dias` : 'Sin registro esta temporada'}
        />
        <OverviewMetric
          label="Noches heladas"
          value={`${f.totalFrostNightsThisSeason}`}
          caption="Desde 1 nov"
          tone={f.totalFrostNightsThisSeason > 10 ? 'warning' : 'default'}
        />
        <OverviewMetric
          label="Dias libres helada"
          value={`${f.frostFreeDays}`}
          caption="Racha actual"
        />
        <OverviewMetric
          label="Helada prevista"
          value={frostNextDate ? fmtDate(frostNextDate) : 'No'}
          caption={frostNextDate ? `En ${frostDaysAway} dias (Tmin &le;0 C)` : 'Ninguna en 14 dias'}
          tone={frostNextDate ? 'warning' : 'default'}
        />
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Temporada fria: {f.totalFrostNightsThisSeason} noches con T&le;0&deg;C · Fuente: ERA5-Land (Open-Meteo Archive) + forecast 14d
      </p>
    </div>
  );
}

function ChillPanel() {
  const { data, loading } = useAgroClimatology();

  if (loading || !data) return null;

  const c = data.chill;
  const barWidth = Math.min(100, c.chillProgressPct);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Horas frio</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">🥶 Acumulado invernal</h3>
        </div>
        <span className="text-xl font-bold text-sky-900 sm:text-2xl">{c.chillHoursAccumulated}<span className="text-sm font-normal text-slate-400"> h</span></span>
      </div>

      <div className="mt-3 sm:mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Objetivo: {c.chillTarget} h</span>
          <span>{c.chillProgressPct}%</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:mt-4 sm:grid-cols-3 sm:gap-3">
        <OverviewMetric label="Horas frio (0-7.2 C)" value={`${c.chillHoursAccumulated} h`} caption="Modelo 0-7.2 C clasico" />
        <OverviewMetric label="Chill Portions" value={`${c.chillPortionsAccumulated}`} caption="Modelo dinamico (CP)" />
        <OverviewMetric label="Temporada" value={fmtDate(c.seasonStart)} caption="Inicio acumulacion" />
      </div>

      <p className="mt-2.5 text-[10px] text-slate-400 sm:mt-3 sm:text-[11px]">
        Las horas-frio determinan la ruptura de dormancia en frutales (almendro, cerezo). Objetivo tipico Altiplano: 500-800 h.
      </p>
    </div>
  );
}

function WaterBalancePanel() {
  const { data, loading, error } = useAgroClimatology();

  if (loading) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-100" />
        <div className="mt-4 h-20 animate-pulse rounded-xl bg-slate-50" />
      </div>
    );
  }

  if (error || !data) return null;

  const w = data.waterBalance;
  const deficit = w.deficitMmThisMonth > 0;

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:rounded-[24px] sm:p-5">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Balance hidrico</p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">💧 Lluvia vs evaporacion</h3>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold sm:px-3 sm:text-xs ${deficit ? 'bg-orange-50 text-orange-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {deficit ? `Deficit ${w.deficitMmThisMonth.toFixed(0)} mm` : `Excedente ${Math.abs(w.deficitMmThisMonth).toFixed(0)} mm`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:gap-3 lg:grid-cols-4">
        <OverviewMetric label="Lluvia mes" value={`${w.precipitationMmThisMonth.toFixed(1)} mm`} caption={w.monthLabel} />
        <OverviewMetric label="Lluvia anual" value={`${w.precipitationMmThisYear.toFixed(0)} mm`} caption={`${new Date().getFullYear()}`} />
        <OverviewMetric label="ET0 mes" value={`${w.et0MmThisMonth.toFixed(1)} mm`} caption="Evapotranspiracion" tone={deficit ? 'warning' : 'default'} />
        <OverviewMetric
          label="Balance mes"
          value={`${w.deficitMmThisMonth > 0 ? '-' : '+'}${Math.abs(w.deficitMmThisMonth).toFixed(1)} mm`}
          caption={deficit ? 'Sequedad (evap > lluvia)' : 'Superavit (lluvia > evap)'}
          tone={deficit ? 'warning' : 'default'}
        />
      </div>

      <div className="mt-3 rounded-[16px] border border-slate-100 bg-slate-50 p-3 sm:mt-4">
        <p className="text-xs font-semibold text-slate-600">Balance temporada agricola ({fmtDate(w.seasonStart)} → hoy)</p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs sm:gap-4 sm:text-sm">
          <span className="text-slate-700">Lluvia: <strong>{w.precipitationMmThisSeason.toFixed(0)} mm</strong></span>
          <span className="text-slate-700">ET0: <strong>{w.et0MmThisSeason.toFixed(0)} mm</strong></span>
          <span className={deficit ? 'text-orange-700' : 'text-emerald-700'}>
            Balance: <strong>{w.deficitMmThisSeason > 0 ? '-' : '+'}{Math.abs(w.deficitMmThisSeason).toFixed(0)} mm</strong>
          </span>
        </div>
      </div>

      <p className="mt-2.5 text-[10px] text-slate-400 sm:mt-3 sm:text-[11px]">
        El deficit hidrico indica cuanto agua ha perdido el suelo por evaporacion/transpiracion sin recuperar con lluvia. Fuente: ERA5-Land via Open-Meteo Archive
      </p>
    </div>
  );
}

export { FrostPanel, ChillPanel, WaterBalancePanel };
