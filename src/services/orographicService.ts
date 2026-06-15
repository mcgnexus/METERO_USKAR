import type { ReliefData } from "@/services/reliefService";
import { getModelParam } from "@/services/modelParameterService";

export interface OrographicResult {
  factor: number;
  classification: "barlovento" | "sotavento" | "neutro";
  description: string;
}

function angleDifferenceDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export function getOrographicFactor(
  windDirectionDeg: number | undefined,
  relief: ReliefData | null
): OrographicResult {
  if (!relief || windDirectionDeg === undefined || relief.slopePct < 2) {
    return {
      factor: 1.0,
      classification: "neutro",
      description: "Sin efecto orográfico significativo",
    };
  }

  const windFromDeg = windDirectionDeg % 360;
  const aspectDeg = relief.aspectDeg;

  const diff = angleDifferenceDeg(windFromDeg, aspectDeg);

  let classification: OrographicResult["classification"];
  let factor: number;

  const slopeWeight = Math.min(1.0, relief.slopePct / 25);
  const windSpeedFactor = 1.0;

  if (diff <= 45) {
    classification = "barlovento";
    const intensity = (1 - diff / 45) * slopeWeight * windSpeedFactor;
    factor = 1.0 + intensity * getModelParam("orographic_barlovento_max");
  } else if (diff >= 135) {
    classification = "sotavento";
    const intensity = ((diff - 135) / 45) * slopeWeight * windSpeedFactor;
    factor = 1.0 - intensity * getModelParam("orographic_sotavento_max");
  } else {
    classification = "neutro";
    factor = 1.0;
  }

  const roundedFactor = Math.round(factor * 100) / 100;

  let description: string;
  if (classification === "barlovento") {
    description = `Barlovento: la ladera enfrenta el viento (${diff.toFixed(0)}° de alineación), pendiente ${relief.slopePct.toFixed(0)}%`;
  } else if (classification === "sotavento") {
    description = `Sotavento: la ladera está a sotavento del viento (${diff.toFixed(0)}° de desalineación), sombra de lluvia`;
  } else {
    description = `Orientación neutra respecto al viento (${diff.toFixed(0)}°)`;
  }

  return {
    factor: roundedFactor,
    classification,
    description,
  };
}

export function applyOrographicPrecipitation(
  basePrecipMm: number,
  windDirectionDeg: number | undefined,
  relief: ReliefData | null
): { precipMm: number; orographic: OrographicResult } {
  const orographic = getOrographicFactor(windDirectionDeg, relief);
  const adjusted = Math.max(0, basePrecipMm * orographic.factor);
  return {
    precipMm: Math.round(adjusted * 10) / 10,
    orographic,
  };
}
