import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/services/cronAuth';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { dispatchDailySummary, dispatchAlarmNotification } from '@/services/pushService';
import { sendTelegramMessage } from '@/services/telegramNotify';
import { initializeDatabase, hasNotificationBeenSent, logNotificationSent } from '@/lib/weatherStore';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('Authorization');
  if (!verifyCronAuthorization(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();

    const [climateResult, weatherResult] = await Promise.allSettled([
      getClimateCalibrationPayload(),
      getCurrentWeatherPayload(),
    ]);

    if (climateResult.status !== 'fulfilled' || !climateResult.value) {
      return NextResponse.json({ error: 'No hay datos del motor climatico' }, { status: 503 });
    }

    const climate = climateResult.value;
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;

    const alarms = buildAlarms(climate, {
      daily: weather?.daily,
      weather: weather ?? undefined,
      agricultural: weather?.agricultural,
    });

    const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
    const daily = weather?.daily;
    const maxTemp = daily?.temperatureMaxC?.[0] ?? temp;
    const minTemp = daily?.temperatureMinC?.[0] ?? temp;
    const rainProb = weather?.hourly?.precipitationProbabilityPct?.[0] ?? 0;

    const criticalAlarms = alarms.filter(a => a.level === 'critico');

    const alarmPushResults = await Promise.all(
      criticalAlarms.map(a => dispatchAlarmNotification(a).catch(() => ({ sent: 0, skipped: true })))
    );

    const alarmPushes = alarmPushResults.reduce(
      (acc, r) => ({ sent: acc.sent + r.sent, skipped: acc.skipped || r.skipped }),
      { sent: 0, skipped: false }
    );

    const summaryResult = await dispatchDailySummary(temp, maxTemp, minTemp, rainProb, alarms);

    // Telegram al propietario: aviso con las alertas críticas activas (máx 1 vez/día).
    let telegramResult: { sent: boolean; skipped: boolean } = { sent: false, skipped: true };
    if (criticalAlarms.length > 0) {
      try {
        const alreadySent = await hasNotificationBeenSent('telegram:alarms-daily', 720);
        if (!alreadySent) {
          const dateLabel = new Date().toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });
          const lines = criticalAlarms.slice(0, 5).map((a) => `\u{1F6A8} ${a.title}\n${a.message}`);
          const text = [
            `\u26A0\uFE0F Alertas Meteo Huéscar — ${dateLabel}`,
            '',
            ...lines,
            '',
            '→ meteo.tecrural.es/huescar/alertas',
          ].join('\n');
          const ok = await sendTelegramMessage(text);
          if (ok) {
            await logNotificationSent('telegram:alarms-daily', null).catch(() => undefined);
          }
          telegramResult = { sent: ok, skipped: !ok };
        }
      } catch (e) {
        telegramResult = { sent: false, skipped: true };
        console.warn('[notify-alarms] Error al notificar por Telegram:', e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({
      success: true,
      alarmsEvaluated: alarms.length,
      criticalAlarms: criticalAlarms.length,
      alarmPushes,
      dailySummary: summaryResult,
      telegram: telegramResult,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error en notify-alarms' },
      { status: 500 }
    );
  }
}
