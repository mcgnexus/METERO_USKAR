'use client';

import { useEffect, useState } from 'react';
import type { PulseAlarm } from '@/components/llano/alarms-logic';
import { levelBadge, levelLabel, levelClass } from '@/components/llano/alarms-logic';

export function AlarmToast({ alarms }: { alarms: PulseAlarm[] }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (alarms.length === 0 || dismissed) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, [alarms.length, dismissed]);

  if (!visible || alarms.length === 0 || dismissed) return null;

  const top = alarms[0];
  const criticas = alarms.filter((a) => a.level === 'critico').length;
  const precauciones = alarms.filter((a) => a.level === 'precaucion').length;

  return (
    <div className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-md animate-slide-down">
      <div className={`rounded-[22px] border p-4 shadow-2xl ${levelClass(top.level)}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${levelBadge(top.level)}`}>
                {levelLabel(top.level)}
              </span>
              <span className="text-[11px] font-bold opacity-70">
                {alarms.length} {alarms.length === 1 ? 'alarma' : 'alarmas'}
                {criticas > 0 && ` · ${criticas} críticas`}
                {precauciones > 0 && ` · ${precauciones} precauciones`}
              </span>
            </div>
            <p className="mt-2 text-sm font-black">{top.title}</p>
            <p className="mt-1 text-xs leading-5 opacity-85 line-clamp-2">{top.message}</p>
            <button
              onClick={() => {
                setDismissed(true);
                document.getElementById('alertas-aemet')?.scrollIntoView({ behavior: 'smooth' });
                setTimeout(() => {
                  const section = document.querySelector('#sem-foro-inteligente');
                  if (section) section.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              className="mt-2 rounded-full bg-black/10 px-3 py-1 text-[11px] font-bold hover:bg-black/20"
            >
              Ver todas las alarmas
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
