import { getModelParam } from "@/services/modelParameterService";

export function correctTemperatureByAltitude(
  tempC: number,
  sourceElevation: number,
  targetElevation: number
): { correctedTemperature: number; correction: number } {
  const correction = (sourceElevation - targetElevation) * getModelParam("altitude_lapse_rate");
  const correctedTemperature = tempC + correction;
  return { correctedTemperature, correction };
}
