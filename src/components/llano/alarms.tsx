'use client';

import Link from 'next/link';
import { type PulseAlarm, levelBadge, levelClass, levelLabel } from '@/components/llano/alarms-logic';

function sourceBadge(source: PulseAlarm['source']) {
  if (!source) return null;
  const map = {
    aemet: { label: 'AEMET', tone: 'bg-rose-100 text-rose-800' },
    modelo: { label: 'Modelo', tone: 'bg-sky-100 text-sky-800' },
    sensor: { label: 'Sensor', tone: 'bg-emerald-100 text-emerald-800' },
    ria: { label: 'RIA', tone: 'bg-amber-100 text-amber-800' },
  };
  const c = map[source];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.tone}`}>{c.label}</span>;
}

export function AlarmBoard({ alarms }: { alarms: PulseAlarm[] }) {
  if (alarms.length === 0) {
    return (
      <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Semáforo inteligente</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">Sin alarmas activas</h2>
            <p className="mt-1 text-sm text-slate-600">
              No se superan umbrales de hielo, helada, viento, ETo, rayos, drenaje catabático ni estrés ganadero.
            </p>
          </div>
          <span className="text-3xl">✓</span>
        </div>
      </section>
    );
  }

  const criticas = alarms.filter((a) => a.level === 'critico');
  const precauciones = alarms.filter((a) => a.level === 'precaucion');
  const avisos = alarms.filter((a) => a.level === 'aviso');

  const groups: { title: string; items: PulseAlarm[]; tone: 'rose' | 'orange' | 'yellow' }[] = [];
  if (criticas.length) groups.push({ title: 'Críticas', items: criticas, tone: 'rose' });
  if (precauciones.length) groups.push({ title: 'Precaución', items: precauciones, tone: 'orange' });
  if (avisos.length) groups.push({ title: 'Aviso', items: avisos, tone: 'yellow' });

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">Semáforo inteligente</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {alarms.length} {alarms.length === 1 ? 'alarma activa' : 'alarmas activas'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {criticas.length} críticas · {precauciones.length} precauciones · {avisos.length} avisos
          </p>
        </div>
        <Link href="/motor-climatico" className="cta-secondary">Ver motor climático</Link>
      </div>

      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {g.title} ({g.items.length})
            </h3>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              {g.items.map((a, i) => (
                <article key={`${a.audience}-${a.title}-${i}`} className={`rounded-[22px] border p-4 ${levelClass(a.level)}`}>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${levelBadge(a.level)}`}>
                      {levelLabel(a.level)}
                    </span>
                    {sourceBadge(a.source)}
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">{a.audience}</p>
                  <h4 className="mt-1 text-base font-black">{a.title}</h4>
                  <p className="mt-1.5 text-xs leading-5 opacity-85">{a.message}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
