import { dewPoint, relativeHumidity } from "@/lib/dewPoint";
import type { ReliefData } from "@/services/reliefService";
import { getWindFactor, getNightInversion } from "@/services/reliefService";

export interface CorrectedValues {
  temperatureC: number;
  humidityPct: number;
  windSpeedKmh: number;
  corrections: {
    altitudeCorrectionC?: number;
    nightInversionC?: number;
    windFactor?: number;
    dewPointAdjustment?: number;
  };
}

export function applyMicroclimateCorrections(
  tempC: number,
  rhPct: number,
  windKmh: number,
  isNight: boolean,
  sourceElevation: number | undefined,
  targetElevation: number,
  relief: ReliefData | null
): CorrectedValues {
  const corrections: CorrectedValues["corrections"] = {};

  let correctedTemp = tempC;
  let correctedRh = rhPct;
  let correctedWind = windKmh;

  if (sourceElevation !== undefined && sourceElevation !== targetElevation) {
    const altCorr = (sourceElevation - targetElevation) * 0.006;
    correctedTemp = tempC + altCorr;
    corrections.altitudeCorrectionC = Math.round(altCorr * 1000) / 1000;
  }

  if (relief) {
    const nightInv = getNightInversion(correctedTemp, correctedWind, isNight, relief);
    if (nightInv !== 0) {
      correctedTemp += nightInv;
      corrections.nightInversionC = nightInv;
    }

    const windFactor = getWindFactor(relief);
    if (windFactor !== 1.0) {
      correctedWind = windKmh * windFactor;
      corrections.windFactor = windFactor;
    }
  }

  if (sourceElevation !== undefined && sourceElevation !== targetElevation) {
    const td = dewPoint(tempC, rhPct);
    const elevDiff = sourceElevation - targetElevation;
    const lapseDewPoint = 0.0018;
    const adjustedDewPoint = td - elevDiff * lapseDewPoint;
    correctedRh = relativeHumidity(correctedTemp, adjustedDewPoint);
    corrections.dewPointAdjustment = Math.round((correctedRh - rhPct) * 10) / 10;
  }

  return {
    temperatureC: Math.round(correctedTemp * 10) / 10,
    humidityPct: Math.round(correctedRh),
    windSpeedKmh: Math.round(correctedWind * 10) / 10,
    corrections,
  };
}
