import type { ClimateCalibrationPayload } from '@/types/climate';
import type { AgriculturalData, DailyWeather, WeatherPayload } from '@/types/weather';

export type AlarmLevel = 'critico' | 'precaucion' | 'aviso';

export interface PulseAlarm {
  level: AlarmLevel;
  audience: string;
  title: string;
  message: string;
  source?: 'aemet' | 'modelo' | 'sensor' | 'ria';
}

function computeThi(tempC: number, humidityPct: number): number {
  const tempF = tempC * 1.8 + 32;
  return tempF - (0.55 - 0.0055 * humidityPct) * (tempF - 58);
}

export function buildAlarms(
  climate: ClimateCalibrationPayload,
  options?: { daily?: DailyWeather; weather?: WeatherPayload | null; agricultural?: AgriculturalData | null }
): PulseAlarm[] {
  const alarms: PulseAlarm[] = [];
  const daily = options?.daily;
  const weather = options?.weather ?? null;
  const agricultural = options?.agricultural ?? null;

  const temp = climate.calibration.realTemperatureC ?? climate.interpolation.estimatedTemperatureC;
  const humidity = climate.nodes.localStation?.humidityPct ?? climate.eto.inputs.humidityPct;
  const dew = climate.dewPoint.dewPointC;

  const todayMin = daily?.temperatureMinC?.[0];
  const todayMax = daily?.temperatureMaxC?.[0];
  const tomorrowMin = daily?.temperatureMinC?.[1];

  // 1) Hielo local (T≤1 + HR≥80)
  if (humidity !== null && temp <= 1 && humidity >= 80) {
    alarms.push({
      level: temp <= 0 ? 'critico' : 'precaucion',
      audience: 'Poblacion',
      title: 'Riesgo de hielo local',
      message: 'Temperatura cercana a 0°C con humedad alta. Precaucion en carreteras locales, acerados y personas mayores.',
      source: 'modelo',
    });
  }

  // 2) Helada negra (T≤0 + T-Td≥2)
  if (dew !== null && temp <= 0 && temp - dew >= 2) {
    alarms.push({
      level: 'critico',
      audience: 'Agricultura',
      title: 'Alerta de helada negra',
      message: 'Ausencia de escarcha protectora. Daño celular inminente en leñosos y cultivos sensibles.',
      source: 'modelo',
    });
  }

  // 3) Inversión térmica nocturna (microclimate.inversionConditions)
  if (climate.microclimate.inversionConditions && temp <= 10) {
    const drainage = climate.microclimate.coldAirDrainageC;
    const frostRisk = temp <= 3;
    alarms.push({
      level: frostRisk ? (drainage <= -3 ? 'critico' : 'precaucion') : 'aviso',
      audience: 'Agricultura',
      title: 'Inversión térmica con drenaje catabático',
      message: `Noche en calma (viento < 2 m/s) con acumulación de aire frío en la cubeta. Corrección: ${drainage.toFixed(1)} °C.${frostRisk ? ' Heladas probables en zonas bajas.' : ''}`,
      source: 'modelo',
    });
  }

  // 4) Helada 48h del forecast (agri.frostRisk48h)
  if (agricultural && (agricultural.frostRisk48h === 'alta' || agricultural.frostRisk48h === 'muy_alta')) {
    alarms.push({
      level: agricultural.frostRisk48h === 'muy_alta' ? 'critico' : 'precaucion',
      audience: 'Agricultura',
      title: 'Riesgo de helada en 48h',
      message: `El pronóstico indica temperaturas mínimas en riesgo ${agricultural.frostRisk48h === 'muy_alta' ? 'muy alto' : 'alto'} durante las próximas 48h. Activar sistemas antihelada en fincas sensibles.`,
      source: 'modelo',
    });
  }

  // 5) Tmin < -5°C en próximos 7 días (workability.reasons ya existe)
  if (typeof tomorrowMin === 'number' && tomorrowMin < -5) {
    alarms.push({
      level: 'critico',
      audience: 'Ganaderia',
      title: 'Mínima extrema mañana',
      message: `Mínima prevista de ${tomorrowMin.toFixed(1)} °C. Riesgo de congelación en animales y conducciones de agua.`,
      source: 'modelo',
    });
  }

  // 6) Amplitud térmica extrema (max-min ≥25)
  if (typeof todayMin === 'number' && typeof todayMax === 'number' && todayMax - todayMin >= 25) {
    alarms.push({
      level: 'aviso',
      audience: 'Poblacion',
      title: 'Amplitud térmica extrema',
      message: `Diferencia prevista de ${(todayMax - todayMin).toFixed(0)} °C entre mínima y máxima. Riesgo de golpe térmico diurno y frío nocturno.`,
      source: 'modelo',
    });
  }

  // 7) Pico de evapotranspiración
  if ((climate.eto.etoHourlyMm ?? 0) >= 0.5 || (climate.nodes.radiationWind.et0DailyMm ?? 0) >= 8) {
    alarms.push({
      level: 'precaucion',
      audience: 'Agricultura',
      title: 'Pico de evapotranspiración',
      message: 'Consumo hídrico elevado. Revisar horas de goteo y humedad del suelo en parcelas de regadio.',
      source: 'modelo',
    });
  }

  // 8) Viento / ráfagas (current.windGustKmh)
  if (weather?.current && weather.current.windGustKmh > 70) {
    alarms.push({
      level: weather.current.windGustKmh > 90 ? 'critico' : 'precaucion',
      audience: 'Poblacion',
      title: 'Ráfagas de viento intensas',
      message: `Ráfagas de ${weather.current.windGustKmh.toFixed(0)} km/h. Precaución en actividades al aire libre, invernaderos y arbolado.`,
      source: 'modelo',
    });
  }

  // 9) Rayos (lightning.active)
  if (weather?.lightning?.active) {
    const level: AlarmLevel = weather.lightning.level === 'peligro' ? 'critico'
      : weather.lightning.level === 'alerta' ? 'precaucion' : 'aviso';
    alarms.push({
      level,
      audience: 'Poblacion',
      title: 'Actividad eléctrica detectada',
      message: `${weather.lightning.strikeCount} rayos en el área${weather.lightning.nearestStrikeKm !== null ? ` (más cercano a ${weather.lightning.nearestStrikeKm.toFixed(0)} km)` : ''}. ${weather.lightning.message}`,
      source: 'aemet',
    });
  }

  // 10) THI ganadero (umbrales para ovino Segureña: estrés ≥80, severo ≥85)
  if (humidity !== null) {
    const thi = computeThi(temp, humidity);
    if (thi >= 85) {
      alarms.push({
        level: 'critico',
        audience: 'Ganaderia',
        title: 'Estrés térmico severo',
        message: `THI ${thi.toFixed(0)}. Riesgo para animales en exterior. Valorar sombra, agua y estabulación.`,
        source: 'modelo',
      });
    } else if (thi >= 80) {
      alarms.push({
        level: 'precaucion',
        audience: 'Ganaderia',
        title: 'Estrés térmico moderado',
        message: `THI ${thi.toFixed(0)}. Vigilar oveja segureña y animales jóvenes.`,
        source: 'modelo',
      });
    }
  }

  // 11) Congelación (T≤-4)
  if (temp <= -4) {
    alarms.push({
      level: 'critico',
      audience: 'Ganaderia',
      title: 'Riesgo de congelación',
      message: 'Temperatura exterior muy baja. Proteger bebederos, crías y animales debilitados.',
      source: 'modelo',
    });
  }

  // 12) AEMET alerts (alertas oficiales)
  if (weather?.alerts) {
    for (const a of weather.alerts) {
      const level: AlarmLevel = a.level === 'severo' ? 'critico'
        : a.level === 'peligro' ? 'precaucion' : 'aviso';
      alarms.push({
        level,
        audience: 'Poblacion',
        title: `AEMET: ${a.title}`,
        message: a.message,
        source: 'aemet',
      });
    }
  }

  const order: Record<AlarmLevel, number> = { critico: 0, precaucion: 1, aviso: 2 };
  return alarms.sort((a, b) => order[a.level] - order[b.level]);
}

export function levelClass(level: AlarmLevel): string {
  if (level === 'critico') return 'border-red-200 bg-red-50 text-red-950';
  if (level === 'precaucion') return 'border-orange-200 bg-orange-50 text-orange-950';
  return 'border-yellow-200 bg-yellow-50 text-yellow-950';
}

export function levelBadge(level: AlarmLevel): string {
  if (level === 'critico') return 'bg-red-600 text-white';
  if (level === 'precaucion') return 'bg-orange-500 text-white';
  return 'bg-yellow-400 text-yellow-950';
}

export function levelLabel(level: AlarmLevel): string {
  if (level === 'critico') return 'Crítico';
  if (level === 'precaucion') return 'Precaución';
  return 'Aviso';
}

export function levelEmoji(level: AlarmLevel): string {
  if (level === 'critico') return '🚨';
  if (level === 'precaucion') return '⚠️';
  return 'ℹ️';
}

export function sourceEmoji(source: PulseAlarm['source']): string {
  if (source === 'aemet') return '🏛️';
  if (source === 'modelo') return '🧠';
  if (source === 'sensor') return '📡';
  if (source === 'ria') return '🌾';
  return '🔹';
}

export function audienceEmoji(audience: string): string {
  const a = audience.toLowerCase();
  if (a.includes('poblacion') || a.includes('población')) return '🏘️';
  if (a.includes('agricultura')) return '🌾';
  if (a.includes('ganaderia') || a.includes('ganadería')) return '🐄';
  if (a.includes('general')) return '👥';
  return '👤';
}
