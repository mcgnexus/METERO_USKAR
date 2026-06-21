const A = 17.62;
const B = 243.12;

const TETENS_A = 17.67;
const TETENS_B = 243.5;

const G = 9.80665;
const M_AIR = 0.02896;
const R_GAS = 8.314;
const GAMMA_STD = 0.0065;
const BAROMETRIC_EXPONENT = (G * M_AIR) / (R_GAS * GAMMA_STD);

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

export function saturationVaporPressureTetens(tempC: number): number {
  return 6.112 * Math.exp((TETENS_A * tempC) / (tempC + TETENS_B));
}

export function barometricPressureHPa(
  sourceElevationM: number,
  targetElevationM: number,
  sourceTemperatureC: number,
  sourcePressureHPa: number
): number {
  const deltaZ = targetElevationM - sourceElevationM;
  const tKelvin = sourceTemperatureC + 273.15;
  const sourcePressureKPa = sourcePressureHPa / 10;
  const factor = 1 - (GAMMA_STD * deltaZ) / tKelvin;
  if (factor <= 0) return sourcePressureHPa;
  return sourcePressureKPa * Math.pow(factor, BAROMETRIC_EXPONENT) * 10;
}

export function conservedRelativeHumidity(
  sourceTempC: number,
  sourceRhPct: number,
  targetTempC: number
): number {
  if (sourceRhPct <= 0 || targetTempC < -100) return 0;
  const esSource = saturationVaporPressureTetens(sourceTempC);
  const eActual = esSource * (sourceRhPct / 100);
  const esTarget = saturationVaporPressureTetens(targetTempC);
  if (esTarget <= 0) return sourceRhPct;
  return Math.min(100, Math.max(0, (eActual / esTarget) * 100));
}

export function actualVaporPressureHPa(tempC: number, rhPct: number): number {
  const es = saturationVaporPressureTetens(tempC);
  return es * (rhPct / 100);
}
