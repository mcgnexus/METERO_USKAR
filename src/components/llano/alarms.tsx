'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type PulseAlarm, levelBadge, levelClass, levelLabel, levelEmoji, audienceEmoji } from '@/components/llano/alarms-logic';

const SOURCE_META = {
  aemet: { label: '🏛️ AEMET', tone: 'bg-rose-100 text-rose-800', desc: 'Alerta oficial de la Agencia Estatal de Meteorología' },
  modelo: { label: '🧠 Modelo', tone: 'bg-sky-100 text-sky-800', desc: 'Cálculo propio del motor climático local' },
  sensor: { label: '📡 Sensor', tone: 'bg-emerald-100 text-emerald-800', desc: 'Medición directa de estación meteorológica' },
  ria: { label: '🌾 RIA', tone: 'bg-amber-100 text-amber-800', desc: 'Red de Información Agrometeorológica de Andalucía' },
} as const;

function sourceBadge(source: PulseAlarm['source']) {
  if (!source) return null;
  const c = SOURCE_META[source];
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.tone}`}>{c.label}</span>;
}

function AlarmModal({ alarm, onClose }: { alarm: PulseAlarm; onClose: () => void }) {
  const meta = alarm.source ? SOURCE_META[alarm.source] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border p-6 ${levelClass(alarm.level)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-black">{levelEmoji(alarm.level)} {alarm.title}</h2>
              <p className="mt-0.5 text-sm capitalize opacity-75">{audienceEmoji(alarm.audience)} {alarm.audience}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${levelBadge(alarm.level)}`}>
              {levelEmoji(alarm.level)} {levelLabel(alarm.level)}
            </span>
            <button
              onClick={onClose}
              className="rounded-full bg-black/10 p-2 hover:bg-black/20"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">📋 Detalle</h3>
            <p className="mt-2 text-sm leading-6">{alarm.message}</p>
          </section>

          {meta && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">📡 Origen</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
                <span className="text-sm opacity-75">{meta.desc}</span>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">👥 Dirigido a</h3>
            <p className="mt-2 text-sm font-bold capitalize">{audienceEmoji(alarm.audience)} {alarm.audience}</p>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">⚡ Acción recomendada</h3>
            <p className="mt-2 text-sm leading-6">
              {alarm.level === 'critico' && '🚨 Tomar medidas inmediatas. Revisar protecciones activas y planes de contingencia.'}
              {alarm.level === 'precaucion' && '⚠️ Preparar medidas preventivas. Monitorizar evolución en las próximas horas.'}
              {alarm.level === 'aviso' && 'ℹ️ Mantenerse informado. No requiere acción inmediata pero se recomienda vigilancia.'}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export function AlarmBoard({ alarms }: { alarms: PulseAlarm[] }) {
  const [expandedAlarm, setExpandedAlarm] = useState<PulseAlarm | null>(null);

  if (alarms.length === 0) {
    return (
    <section id="sem-foro-inteligente" className="surface-card-strong rounded-[28px] p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">🚦 Semáforo inteligente</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">✅ Sin alarmas activas</h2>
            <p className="mt-1 text-sm text-slate-600">
              🌤️ No se superan umbrales de hielo, helada, viento, ETo, rayos, drenaje catabático ni estrés ganadero.
            </p>
          </div>
          <span className="text-3xl">✅</span>
        </div>
      </section>
    );
  }

  const criticas = alarms.filter((a) => a.level === 'critico');
  const precauciones = alarms.filter((a) => a.level === 'precaucion');
  const avisos = alarms.filter((a) => a.level === 'aviso');

  const groups: { title: string; items: PulseAlarm[]; tone: 'rose' | 'orange' | 'yellow' }[] = [];
  if (criticas.length) groups.push({ title: '🚨 Críticas', items: criticas, tone: 'rose' });
  if (precauciones.length) groups.push({ title: '⚠️ Precaución', items: precauciones, tone: 'orange' });
  if (avisos.length) groups.push({ title: 'ℹ️ Aviso', items: avisos, tone: 'yellow' });

  return (
    <section className="surface-card-strong rounded-[28px] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-700">🚦 Semáforo inteligente</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            🚨 {alarms.length} {alarms.length === 1 ? 'alarma activa' : 'alarmas activas'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            🚨 {criticas.length} críticas · ⚠️ {precauciones.length} precauciones · ℹ️ {avisos.length} avisos
          </p>
        </div>
        <Link href="/motor-climatico" className="cta-secondary">🌡️ Ver motor climático</Link>
      </div>

      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              {g.title} ({g.items.length})
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((a, i) => (
                <article key={`${a.audience}-${a.title}-${i}`} className={`cursor-pointer rounded-[22px] border p-4 transition-all hover:shadow-lg ${levelClass(a.level)}`} onClick={() => setExpandedAlarm(a)}>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${levelBadge(a.level)}`}>
                      {levelEmoji(a.level)} {levelLabel(a.level)}
                    </span>
                    {sourceBadge(a.source)}
                  </div>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">{audienceEmoji(a.audience)} {a.audience}</p>
                  <h4 className="mt-1 text-base font-black">{levelEmoji(a.level)} {a.title}</h4>
                  <p className="mt-1.5 text-xs leading-5 opacity-85">{a.message}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>

      {expandedAlarm && (
        <AlarmModal
          alarm={expandedAlarm}
          onClose={() => setExpandedAlarm(null)}
        />
      )}
    </section>
  );
}
