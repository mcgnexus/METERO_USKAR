'use client';

import { useState } from 'react';
import { type PulseAlarm, levelBadge, levelClass, levelLabel, levelEmoji, audienceEmoji } from '@/components/llano/alarms-logic';

const SOURCE_META = {
  aemet: { label: 'AEMET', tone: 'bg-rose-100 text-rose-800', desc: 'Alerta oficial' },
  modelo: { label: 'Modelo', tone: 'bg-sky-100 text-sky-800', desc: 'Cálculo del motor climático' },
  sensor: { label: 'Sensor', tone: 'bg-emerald-100 text-emerald-800', desc: 'Medición directa' },
  ria: { label: 'RIA', tone: 'bg-amber-100 text-amber-800', desc: 'Red Agrometeorológica' },
} as const;

function actionForLevel(level: PulseAlarm['level'], audience: string): string {
  if (level === 'critico') {
    if (audience === 'Agricultura') return 'Activar medidas de protección. Revisar cultivos, sistemas antihelada y programación de riego.';
    if (audience === 'Ganaderia') return 'Revisar animales urgentemente. Asegurar agua, sombra y refugio. Evitar manejo y traslados.';
    return 'Tomar medidas inmediatas. Evitar exposición innecesaria. Revisar planes de contingencia.';
  }
  if (level === 'precaucion') {
    if (audience === 'Agricultura') return 'Preparar protección para cultivos sensibles. Vigilar evolución en próximas horas.';
    if (audience === 'Ganaderia') return 'Asegurar agua y sombra disponible. Vigilar animales vulnerables.';
    return 'Preparar medidas preventivas. Mantener vigilancia.';
  }
  return 'Mantenerse informado. No requiere acción inmediata pero vigilancia recomendada.';
}

function audienceDescription(audience: string): string {
  if (audience === 'Agricultura') return 'Agricultores, hortelanos y cultivos';
  if (audience === 'Ganaderia') return 'Ganaderos y animales en exterior';
  return 'Población general, conductores y peatones';
}

function AlertModal({ alarm, onClose }: { alarm: PulseAlarm; onClose: () => void }) {
  const meta = alarm.source ? SOURCE_META[alarm.source] : null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border p-6 ${levelClass(alarm.level)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{levelEmoji(alarm.level)}</span>
            <div>
              <h2 className="text-xl font-black">{alarm.title}</h2>
              <p className="mt-0.5 text-sm opacity-75">{audienceEmoji(alarm.audience)} {alarm.audience}</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${levelBadge(alarm.level)}`}>
            {levelLabel(alarm.level)}
          </span>
        </div>

        <div className="mt-6 space-y-4">
          <Section title="📋 Qué ocurre" body={alarm.message} />
          <Section title="👥 A quién afecta" body={audienceDescription(alarm.audience)} />
          <Section title="✅ Qué hacer" body={actionForLevel(alarm.level, alarm.audience)} emphasis="Acción recomendada" />

          {meta && (
            <div className="flex items-center gap-2 rounded-xl bg-white/60 p-3 text-sm">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.tone}`}>{meta.label}</span>
              <span className="text-slate-600">{meta.desc}</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-white/80 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-white"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

function Section({ title, body, emphasis }: { title: string; body: string; emphasis?: string }) {
  return (
    <section className="rounded-2xl bg-white/70 p-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.16em] opacity-60">{title}</h3>
      {emphasis && <p className="mt-1 text-sm font-bold">{emphasis}</p>}
      <p className="mt-1 text-sm leading-6">{body}</p>
    </section>
  );
}

function alarmOrder(a: PulseAlarm): number {
  if (a.level === 'critico') return 0;
  if (a.level === 'precaucion') return 1;
  return 2;
}

export function AlertsTab({ alarms }: { alarms: PulseAlarm[] }) {
  const [expanded, setExpanded] = useState<PulseAlarm | null>(null);

  const sorted = [...alarms].sort((a, b) => alarmOrder(a) - alarmOrder(b));
  const criticas = sorted.filter(a => a.level === 'critico');
  const precauciones = sorted.filter(a => a.level === 'precaucion');
  const avisos = sorted.filter(a => a.level === 'aviso');

  if (alarms.length === 0) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-[22px] border border-emerald-200 bg-emerald-50/80 p-8">
        <div className="text-center">
          <p className="text-4xl">✅</p>
          <h2 className="mt-3 text-xl font-black text-emerald-900">Sin alertas activas</h2>
          <p className="mt-2 text-sm text-emerald-700">
            No se superan umbrales de riesgo. Condiciones dentro de la normalidad.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-[22px] border border-slate-200 bg-white p-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Resumen</h2>
        <p className="mt-2 text-2xl font-black text-slate-900">
          {alarms.length} {alarms.length === 1 ? 'alerta activa' : 'alertas activas'}
        </p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          {criticas.length > 0 && <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-800">🚨 {criticas.length} críticas</span>}
          {precauciones.length > 0 && <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-800">⚠️ {precauciones.length} precauciones</span>}
          {avisos.length > 0 && <span className="rounded-full bg-yellow-100 px-3 py-1 font-bold text-yellow-800">ℹ️ {avisos.length} avisos</span>}
        </div>
      </section>

      {criticas.length > 0 && (
        <section className="space-y-3">
          <h3 className="px-1 text-sm font-bold uppercase tracking-[0.16em] text-red-700">🚨 Críticas</h3>
          {criticas.map((a, i) => (
            <AlertCard key={`crit-${i}`} alarm={a} onOpen={() => setExpanded(a)} />
          ))}
        </section>
      )}

      {precauciones.length > 0 && (
        <section className="space-y-3">
          <h3 className="px-1 text-sm font-bold uppercase tracking-[0.16em] text-orange-700">⚠️ Precaución</h3>
          {precauciones.map((a, i) => (
            <AlertCard key={`prec-${i}`} alarm={a} onOpen={() => setExpanded(a)} />
          ))}
        </section>
      )}

      {avisos.length > 0 && (
        <section className="space-y-3">
          <h3 className="px-1 text-sm font-bold uppercase tracking-[0.16em] text-yellow-700">ℹ️ Avisos</h3>
          {avisos.map((a, i) => (
            <AlertCard key={`aviso-${i}`} alarm={a} onOpen={() => setExpanded(a)} />
          ))}
        </section>
      )}

      {expanded && <AlertModal alarm={expanded} onClose={() => setExpanded(null)} />}
    </div>
  );
}

function AlertCard({ alarm, onOpen }: { alarm: PulseAlarm; onOpen: () => void }) {
  const meta = alarm.source ? SOURCE_META[alarm.source] : null;
  const action = actionForLevel(alarm.level, alarm.audience);
  return (
    <button
      type="button"
      className={`w-full rounded-[22px] border p-4 text-left transition-all hover:shadow-md ${levelClass(alarm.level)}`}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${levelBadge(alarm.level)}`}>
              {levelLabel(alarm.level)}
            </span>
            {meta && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.tone}`}>{meta.label}</span>}
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">{audienceEmoji(alarm.audience)} {alarm.audience}</span>
          </div>
          <h4 className="mt-2 text-base font-black">{levelEmoji(alarm.level)} {alarm.title}</h4>
          <p className="mt-1.5 text-xs leading-5 opacity-85"><span className="font-bold">Qué ocurre:</span> {alarm.message}</p>
          <p className="mt-1.5 text-xs leading-5 opacity-85"><span className="font-bold">A quién afecta:</span> {audienceDescription(alarm.audience)}</p>
          <div className="mt-2 rounded-lg bg-white/70 p-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">✅ Qué hacer</p>
            <p className="text-xs leading-5">{action}</p>
          </div>
        </div>
        <span className="mt-1 shrink-0 text-lg opacity-40">›</span>
      </div>
    </button>
  );
}
