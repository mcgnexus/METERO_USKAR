import 'server-only';
import webpush from 'web-push';
import {
  getPushSubscriptions,
  savePushSubscription,
  removePushSubscription,
  hasNotificationBeenSent,
  logNotificationSent,
} from '@/lib/weatherStore';
import type { PulseAlarm } from '@/components/llano/alarms-logic';

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    'mailto:meteo@huescar.es',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function subscribe(
  endpoint: string,
  keysP256dh: string,
  keysAuth: string
): Promise<void> {
  await savePushSubscription(endpoint, keysP256dh, keysAuth);
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await removePushSubscription(endpoint);
}

export async function sendTestNotification(endpoint?: string): Promise<{ sent: number; failed: number }> {
  const subs = await getPushSubscriptions();
  const target = endpoint ? subs.filter(s => s.endpoint === endpoint) : subs;

  let sent = 0;
  let failed = 0;

  for (const sub of target) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({
          title: '🧪 Meteo Huéscar — Notificaciones activadas',
          body: 'Recibirás avisos de heladas, calor extremo, viento y tormentas.',
          url: '/huescar',
        })
      );
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

export async function dispatchAlarmNotification(
  alarm: PulseAlarm
): Promise<{ sent: number; skipped: boolean }> {
  const alarmKey = `${alarm.level}:${alarm.title}`;

  const alreadySent = await hasNotificationBeenSent(alarmKey, alarm.level === 'critico' ? 60 : 180);
  if (alreadySent) {
    return { sent: 0, skipped: true };
  }

  const subs = await getPushSubscriptions();
  if (subs.length === 0) {
    return { sent: 0, skipped: true };
  }

  let sent = 0;

  for (const sub of subs) {
    try {
      const icon = alarm.level === 'critico' ? '🚨' : alarm.level === 'precaucion' ? '⚠️' : 'ℹ️';
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({
          title: `${icon} ${alarm.title}`,
          body: alarm.message,
          url: '/huescar',
          tag: alarmKey,
        })
      );
      sent++;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 410) {
        await unsubscribe(sub.endpoint);
      }
    }
  }

  if (sent > 0) {
    await logNotificationSent(alarmKey, null);
  }

  return { sent, skipped: false };
}

export async function dispatchDailySummary(
  tempC: number,
  maxTempC: number,
  minTempC: number,
  rainProbability: number,
  alerts: PulseAlarm[]
): Promise<{ sent: number; skipped: boolean }> {
  const alarmKey = 'daily-summary';
  const alreadySent = await hasNotificationBeenSent(alarmKey, 720);
  if (alreadySent) {
    return { sent: 0, skipped: true };
  }

  const subs = await getPushSubscriptions();
  if (subs.length === 0) {
    return { sent: 0, skipped: true };
  }

  const criticalCount = alerts.filter(a => a.level === 'critico').length;
  const warningCount = alerts.filter(a => a.level === 'precaucion').length;

  let body = `Hoy: ${minTempC.toFixed(0)}°-${maxTempC.toFixed(0)}°C`;
  if (rainProbability >= 40) body += ` · ☔ ${rainProbability.toFixed(0)}% lluvia`;
  if (criticalCount > 0) body += ` · ${criticalCount} alerta(s) critica(s)`;
  else if (warningCount > 0) body += ` · ${warningCount} aviso(s)`;

  let sent = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        JSON.stringify({
          title: '🌅 Resumen del día — Meteo Huéscar',
          body,
          url: '/huescar',
          tag: alarmKey,
        })
      );
      sent++;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && err.statusCode === 410) {
        await unsubscribe(sub.endpoint);
      }
    }
  }

  if (sent > 0) {
    await logNotificationSent(alarmKey, null);
  }

  return { sent, skipped: false };
}
