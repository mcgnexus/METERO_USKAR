import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { RadarData } from "@/types/weather";

const CACHE_KEY = "radar_precipitation_data";
const CACHE_TTL_MS = 8 * 60 * 1000; // El radar de AEMET se actualiza cada 10 min

export async function fetchRadarPrecipitation(lat: number, lon: number): Promise<RadarData> {
  const cached = cacheGet<RadarData>(CACHE_KEY);
  if (cached) return cached;

  const radarImageUrl = "/api/weather/radar/image";
  let hasPrecipitationNearby = false;
  let level: RadarData["level"] = "ninguno";
  let message = "No se detectan precipitaciones en el radar regional.";
  let minutesToRain: number | null = null;
  let fetchSucceeded = false;

  try {
    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&minutely_15=precipitation` +
      `&forecast_days=1&timezone=auto`;

    const response = await fetch(forecastUrl, { signal: AbortSignal.timeout(6000) });
    if (response.ok) {
      const data = await response.json();
      const minutely = data.minutely_15;

      if (minutely && Array.isArray(minutely.precipitation)) {
        const nextTwoHours = minutely.precipitation.slice(0, 8) as number[];
        const firstRainIdx = nextTwoHours.findIndex((precip) => precip > 0.1);

        if (firstRainIdx !== -1) {
          hasPrecipitationNearby = true;
          minutesToRain = (firstRainIdx + 1) * 15;
          const rainAmount = nextTwoHours[firstRainIdx];

          if (rainAmount > 4.0) {
            level = "peligro";
            message = `âš ï¸ Tormenta fuerte detectada. Lluvia intensa estimada en ${minutesToRain} minutos (${rainAmount.toFixed(1)} mm).`;
          } else if (rainAmount > 1.5) {
            level = "alerta";
            message = `ðŸŒ§ï¸ Precipitaciones moderadas estimadas en ${minutesToRain} minutos.`;
          } else {
            level = "aviso";
            message = `ðŸŒ¦ï¸ Posibilidad de lluvia dÃ©bil en ${minutesToRain} minutos.`;
          }
        }
        fetchSucceeded = true;
      }
    }
  } catch (error) {
    console.error("[Radar] Error en nowcasting de Open-Meteo:", error);
  }

  const result: RadarData = {
    hasPrecipitationNearby,
    level,
    radarImageUrl,
    message,
    minutesToRain,
    lastUpdated: new Date().toISOString(),
  };

  if (fetchSucceeded) {
    cacheSet(CACHE_KEY, result, CACHE_TTL_MS);
  }

  return result;
}
