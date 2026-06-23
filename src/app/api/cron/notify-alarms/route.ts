import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/services/cronAuth';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { dispatchDailySummary } from '@/services/pushService';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('Authorization');
  if (!verifyCronAuthorization(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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

    const result = await dispatchDailySummary(temp, maxTemp, minTemp, rainProb, alarms);

    return NextResponse.json({
      success: true,
      alarmsEvaluated: alarms.length,
      criticalAlarms: alarms.filter(a => a.level === 'critico').length,
      dailySummary: result,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error en notify-alarms' },
      { status: 500 }
    );
  }
}
