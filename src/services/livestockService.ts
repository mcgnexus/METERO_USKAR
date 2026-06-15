import type { LivestockData } from "@/types/weather";
import { saturationVaporPressure } from "@/lib/dewPoint";

function computeTHI(temperatureC: number, humidityPct: number): number {
  // Fórmula NRC (1971): THI = T + 0.36 * e + 41.2, con e en kPa.
  // saturationVaporPressure devuelve hPa, se divide entre 10 para kPa.
  const e = (humidityPct / 100) * saturationVaporPressure(temperatureC) / 10;
  return temperatureC + 0.36 * e + 41.2;
}

function getLevel(thi: number): LivestockData["level"] {
  if (thi < 68) return "ninguno";
  if (thi < 72) return "leve";
  if (thi < 80) return "moderado";
  if (thi < 90) return "severo";
  return "peligroso";
}

function getAffectedLivestock(level: LivestockData["level"]): string {
  switch (level) {
    case "ninguno":
      return "Ninguno afectado";
    case "leve":
      return "Vacas lecheras de alta producción, ovejas finas";
    case "moderado":
      return "Vacas lecheras, ovejas, cabras, cerdos de engorde";
    case "severo":
      return "Todo el ganado lechero, porcino intensivo, aves de corral";
    case "peligroso":
      return "Mortalidad potencial en todo tipo de ganado";
  }
}

export function computeLivestockData(temperatureC: number, humidityPct: number): LivestockData {
  const thi = Math.round(computeTHI(temperatureC, humidityPct) * 100) / 100;
  const level = getLevel(thi);
  return {
    thi,
    level,
    affectedLivestock: getAffectedLivestock(level),
  };
}
