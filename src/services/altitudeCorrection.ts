const LAPSE_RATE = 0.006;

export function correctTemperatureByAltitude(
  tempC: number,
  sourceElevation: number,
  targetElevation: number
): { correctedTemperature: number; correction: number } {
  const correction = (sourceElevation - targetElevation) * LAPSE_RATE;
  const correctedTemperature = tempC + correction;
  return { correctedTemperature, correction };
}
