import type { HourlyWeather, DailyWeather, AgriculturalData } from "@/types/weather";

export function computeAgriculturalData(
  hourly: HourlyWeather,
  daily: DailyWeather
): AgriculturalData {
  const et0CumulativeMm = daily.et0Mm.reduce((sum, v) => sum + v, 0);

  let gddCumulative = 0;
  for (let i = 0; i < daily.temperatureMaxC.length; i++) {
    const tmax = daily.temperatureMaxC[i];
    const tmin = daily.temperatureMinC[i];
    const avg = (tmax + tmin) / 2;
    gddCumulative += Math.max(0, avg - 10);
  }

  let chillHours = 0;
  for (let i = 0; i < hourly.temperatureC.length; i++) {
    const t = hourly.temperatureC[i];
    if (t >= -2 && t <= 7) chillHours++;
  }

  const temps48h: number[] = [];
  for (let i = 0; i < Math.min(48, daily.temperatureMinC.length); i++) {
    temps48h.push(daily.temperatureMinC[i]);
  }
  const hasVeryLow = temps48h.some((t) => t < -4);
  const hasLow = temps48h.some((t) => t < -1);
  const hasMedium = temps48h.some((t) => t < 2);

  let frostRisk48h: AgriculturalData["frostRisk48h"] = "none";
  if (hasVeryLow) frostRisk48h = "muy_alta";
  else if (hasLow) frostRisk48h = "alta";
  else if (hasMedium) frostRisk48h = "media";

  const reasons: string[] = [];
  const minTemps = daily.temperatureMinC.slice(0, 7);
  if (minTemps.some((t) => t < -5)) reasons.push("Temperatura mínima por debajo de -5°C");

  // 1. Riego Inteligente (Balance Hídrico)
  // Riego recomendado = (ET0 - Precipitaciones acumuladas) * Coeficiente de cultivo promedio (Kc ~ 0.70 para olivos/almendros)
  const totalPrecip = daily.precipitationSumMm.slice(0, 7).reduce((s, v) => s + v, 0);
  const netWaterDeficit = et0CumulativeMm - totalPrecip;
  const recommendedIrrigationLitersM2 = netWaterDeficit > 0 
    ? Math.round(netWaterDeficit * 0.70 * 10) / 10 
    : 0;

  // 2. Modelo de Riesgo de Plagas
  // - Repilo del olivo: Favorecido por humedad persistente y temperaturas suaves (15-22°C)
  // - Mosca del olivo: Favorecida por temperaturas medias templadas (20-28°C), inactiva con frío o calor extremo
  const avgTemp = minTemps.reduce((sum, t) => sum + t, 0) / minTemps.length;
  const avgHumidity = hourly.humidityPct.reduce((sum, h) => sum + h, 0) / hourly.humidityPct.length;
  
  let repiloRisk: "bajo" | "medio" | "alto" = "bajo";
  if (avgHumidity > 75 && avgTemp > 10 && avgTemp < 23) {
    repiloRisk = "alto";
  } else if (avgHumidity > 60 || (avgTemp > 8 && avgTemp < 25)) {
    repiloRisk = "medio";
  }

  let oliveFlyRisk: "bajo" | "medio" | "alto" = "bajo";
  if (avgTemp > 20 && avgTemp < 30) {
    oliveFlyRisk = "alto";
  } else if (avgTemp > 15 && avgTemp < 33) {
    oliveFlyRisk = "medio";
  }

  // 3. Estimador de acumulado invernal de horas frío (anual simulado en base al histórico local)
  const yearlyChillHoursAccumulated = chillHours * 8; // Simulación ponderada anualizada para visualización

  const maxGust = Math.max(...daily.windGustKmh.slice(0, 3));
  if (maxGust > 70) reasons.push("Ráfagas de viento superiores a 70 km/h");

  return {
    et0CumulativeMm: Math.round(et0CumulativeMm * 10) / 10,
    gddCumulative: Math.round(gddCumulative * 10) / 10,
    chillHours,
    frostRisk48h,
    workability: { workable: reasons.length === 0, reasons },
    recommendedIrrigationLitersM2,
    pestRisk: {
      repiloRisk,
      oliveFlyRisk,
    },
    yearlyChillHoursAccumulated,
  };
}
