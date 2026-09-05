import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/services/cronAuth';
import { getClimateCalibrationPayload } from '@/services/climateCalibrationPayloadService';
import { getCurrentWeatherPayload } from '@/services/currentWeatherService';
import { fetchAgroClimatology } from '@/services/agroClimatologyService';
import { buildAlarms } from '@/components/llano/alarms-logic';
import { buildWeeklyNewsletter } from '@/services/weeklyNewsletter';
import { sendTelegramMessage } from '@/services/telegramNotify';
import { initializeDatabase } from '@/lib/weatherStore';

const HUESCAR = { lat: 37.8094, lon: -2.5392, elevation: 953 };

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('Authorization');
  if (!verifyCronAuthorization(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();

    const [climateResult, weatherResult, agroResult] = await Promise.allSettled([
      getClimateCalibrationPayload(),
      getCurrentWeatherPayload(),
      fetchAgroClimatology(HUESCAR.lat, HUESCAR.lon, HUESCAR.elevation),
    ]);

    if (climateResult.status !== 'fulfilled' || !climateResult.value) {
      return NextResponse.json({ error: 'No hay datos del motor clim\u00E1tico' }, { status: 503 });
    }

    const climate = climateResult.value;
    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
    const agro = agroResult.status === 'fulfilled' ? agroResult.value : null;

    if (!weather) {
      return NextResponse.json({ error: 'No hay datos meteorol\u00F3gicos' }, { status: 503 });
    }

    const alarms = buildAlarms(climate, {
      daily: weather.daily,
      weather,
      agricultural: weather.agricultural,
    });

    const newsletter = buildWeeklyNewsletter(weather, alarms, agro);

    const sent = await sendTelegramMessage(newsletter);

    return NextResponse.json({
      success: true,
      sent,
      newsletterLength: newsletter.length,
      alarmsCount: alarms.length,
      criticalAlarms: alarms.filter((a) => a.level === 'critico').length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error en weekly-newsletter' },
      { status: 500 },
    );
  }
}
