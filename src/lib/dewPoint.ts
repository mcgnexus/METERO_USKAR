const A = 17.62;
const B = 243.12;

export function saturationVaporPressure(tempC: number): number {
  return 6.112 * Math.exp((A * tempC) / (B + tempC));
}

export function dewPoint(tempC: number, rhPct: number): number {
  if (rhPct <= 0) return -273.15;
  const es = saturationVaporPressure(tempC);
  const e = (rhPct / 100) * es;
  const lnE = Math.log(e / 6.112);
  return (B * lnE) / (A - lnE);
}

export function relativeHumidity(tempC: number, dewPointC: number): number {
  const es = saturationVaporPressure(tempC);
  const e = 6.112 * Math.exp((A * dewPointC) / (B + dewPointC));
  return Math.min(100, Math.max(0, (e / es) * 100));
}

export function correctHumidityByElevation(
  tempC: number,
  rhPct: number,
  sourceElevation: number,
  targetElevation: number
): number {
  if (sourceElevation === targetElevation) return rhPct;
  const td = dewPoint(tempC, rhPct);
  const elevDiff = sourceElevation - targetElevation;
  const lapseDewPoint = 0.0018;
  const adjustedDewPoint = td - elevDiff * lapseDewPoint;
  const correctedTemp = tempC + elevDiff * 0.006;
  return relativeHumidity(correctedTemp, adjustedDewPoint);
}
