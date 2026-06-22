'use client';

import { useEffect, useState } from 'react';
import type { PulseAlarm } from '@/components/llano/alarms-logic';
import { levelBadge, levelLabel, levelClass, levelEmoji } from '@/components/llano/alarms-logic';

export function AlarmToast({ alarms }: { alarms: PulseAlarm[] }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const urgentAlarms = alarms.filter((a) => a.level === 'critico' || a.level === 'precaucion');

  useEffect(() => {
    if (urgentAlarms.length === 0 || dismissed) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [urgentAlarms.length, dismissed]);

  if (!visible || urgentAlarms.length === 0 || dismissed) return null;

  const top = urgentAlarms[0];
  const criticas = urgentAlarms.filter((a) => a.level === 'critico').length;
  const precauciones = urgentAlarms.filter((a) => a.level === 'precaucion').length;

  return (
    <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-md animate-slide-down">
      <div className={`rounded-[22px] border p-4 shadow-2xl ${levelClass(top.level)}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${levelBadge(top.level)}`}>
                {levelEmoji(top.level)} {levelLabel(top.level)}
              </span>
              <span className="text-[11px] font-bold opacity-70">
                {urgentAlarms.length} {urgentAlarms.length === 1 ? 'alarma' : 'alarmas'}
                {criticas > 0 && ` · 🚨 ${criticas} críticas`}
                {precauciones > 0 && ` · ⚠️ ${precauciones} precauciones`}
              </span>
            </div>
            <p className="mt-2 text-sm font-black">{levelEmoji(top.level)} {top.title}</p>
            <p className="mt-1 text-xs leading-5 opacity-85 line-clamp-2">{top.message}</p>
            <button
              onClick={() => {
                setDismissed(true);
                document.querySelector('#sem-foro-inteligente')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="mt-2 rounded-full bg-black/10 px-3 py-1 text-[11px] font-bold hover:bg-black/20"
            >
              🔔 Ver todas las alarmas
            </button>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 rounded-full bg-black/10 p-1.5 hover:bg-black/20"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
