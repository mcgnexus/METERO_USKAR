import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { RadarData } from "@/types/weather";

const CACHE_KEY = "radar_precipitation_data";
const CACHE_TTL_MS = 8 * 60 * 1000; // El radar de AEMET se actualiza cada 10 min
const AEMET_API_KEY = process.env.AEMET_API_KEY || "";
const RADAR_ENDPOINT = "https://opendata.aemet.es/opendata/api/red/radar/regional/am"; // Radar de Almería/Granada

export async function fetchRadarPrecipitation(lat: number, lon: number): Promise<RadarData> {
  const cached = cacheGet<RadarData>(CACHE_KEY);
  if (cached) return cached;

  let radarImageUrl: string | null = null;
  let hasPrecipitationNearby = false;
  let level: RadarData["level"] = "ninguno";
  let message = "No se detectan precipitaciones en el radar regional.";
  let minutesToRain: number | null = null;

  // 1. Intentar obtener la última imagen de radar de AEMET
  if (AEMET_API_KEY) {
    try {
      const url = `${RADAR_ENDPOINT}?api_key=${AEMET_API_KEY}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) {
        const json = await response.json();
        if (json && json.datos) {
          radarImageUrl = json.datos; // URL directa de la imagen gráfica de AEMET
        }
      }
    } catch (e) {
      console.error("[Radar] Error obteniendo radar regional de AEMET:", e);
    }
  }

  // 2. Obtener pronóstico de lluvias a muy corto plazo (próximas horas) vía Open-Meteo
  try {
    const forecastUrl =
      `https://api.open-meteo.com/v1/forecast?` +
      `latitude=${lat}&longitude=${lon}` +
      `&minutely_15=precipitation` +
      `&forecast_days=1&timezone=auto`;
      
    const res = await fetch(forecastUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      const minutely = data.minutely_15;
      
      if (minutely && Array.isArray(minutely.precipitation)) {
        // Analizamos los próximos 8 intervalos de 15 minutos (próximas 2 horas)
        const nextTwoHours = minutely.precipitation.slice(0, 8) as number[];
        const times = minutely.time.slice(0, 8) as string[];
        
        const firstRainIdx = nextTwoHours.findIndex((precip) => precip > 0.1); // umbral de lluvia perceptible
        
        if (firstRainIdx !== -1) {
          hasPrecipitationNearby = true;
          minutesToRain = (firstRainIdx + 1) * 15;
          const rainAmount = nextTwoHours[firstRainIdx];
          
          if (rainAmount > 4.0) {
            level = "peligro";
            message = `⚠️ Tormenta fuerte detectada. Lluvia intensa estimada en ${minutesToRain} minutos (${rainAmount.toFixed(1)} mm).`;
          } else if (rainAmount > 1.5) {
            level = "alerta";
            message = `🌧️ Precipitaciones moderadas estimadas en ${minutesToRain} minutos.`;
          } else {
            level = "aviso";
            message = `🌦️ Posibilidad de lluvia débil en ${minutesToRain} minutos.`;
          }
        }
      }
    }
  } catch (e) {
    console.error("[Radar] Error en Nowcasting de Open-Meteo:", e);
  }

  const result: RadarData = {
    hasPrecipitationNearby,
    level,
    radarImageUrl,
    message,
    minutesToRain,
    lastUpdated: new Date().toISOString(),
  };

  cacheSet(CACHE_KEY, result, CACHE_TTL_MS);
  return result;
}
