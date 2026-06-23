'use client';

import { useEffect, useRef } from 'react';
import type { PulseAlarm } from '@/components/llano/alarms-logic';

const LS_KEY = 'meteo_shown_notifications';
const COOLDOWN_MS = 30 * 60 * 1000;

function getShownNotifications(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function markNotificationShown(key: string) {
  if (typeof window === 'undefined') return;
  const shown = getShownNotifications();
  shown[key] = Date.now();
  const cleaned: Record<string, number> = {};
  for (const [k, ts] of Object.entries(shown)) {
    if (Date.now() - ts < COOLDOWN_MS) cleaned[k] = ts;
  }
  localStorage.setItem(LS_KEY, JSON.stringify(cleaned));
}

export function LocalAlarmNotifier({ alarms }: { alarms: PulseAlarm[] }) {
  const alarmsRef = useRef(alarms);
  alarmsRef.current = alarms;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (!('serviceWorker' in navigator)) return;

    const shown = getShownNotifications();

    for (const alarm of alarmsRef.current) {
      if (alarm.level !== 'critico') continue;

      const key = `${alarm.level}:${alarm.title}`;
      const lastShown = shown[key];
      if (lastShown && Date.now() - lastShown < COOLDOWN_MS) continue;

      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(
            `🚨 ${alarm.title}`,
            {
              body: alarm.message,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192-maskable.png',
              tag: key,
              data: { url: '/huescar' },
            }
          );
          markNotificationShown(key);
        })
        .catch(() => {});
    }
  }, [alarms]);

  return null;
}
