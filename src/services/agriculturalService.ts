import type { HourlyWeather, DailyWeather, AgriculturalData } from "@/types/weather";

export function computeAgriculturalData(
  hourly: HourlyWeather,
  daily: DailyWeather,
  currentTemp: number
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

  const totalPrecip = daily.precipitationSumMm.slice(0, 3).reduce((s, v) => s + v, 0);
  if (totalPrecip > 15) reasons.push("Precipitación acumulada superior a 15 mm");

  const maxGust = Math.max(...daily.windGustKmh.slice(0, 3));
  if (maxGust > 70) reasons.push("Ráfagas de viento superiores a 70 km/h");

  return {
    et0CumulativeMm: Math.round(et0CumulativeMm * 10) / 10,
    gddCumulative: Math.round(gddCumulative * 10) / 10,
    chillHours,
    frostRisk48h,
    workability: { workable: reasons.length === 0, reasons },
  };
}
