import type { SourceObservation } from "@/types/weather";

export function calculateConsensusConfidence(
  sources: SourceObservation[],
  tolerances: Record<string, number>
): { confidencePct: number; explanation: string } {
  const BASE_CONFIDENCE = 92;
  const penalties: string[] = [];
  let totalPenalty = 0;

  const aemet = sources.find((s) => s.source === "AEMET");
  const om = sources.find((s) => s.source === "OPEN_METEO");
  const both = aemet && om;

  const aemetAge = aemet?.dataAgeMinutes ?? 0;
  const omAge = om?.dataAgeMinutes ?? 0;
  const anyStale = aemetAge > 120 || omAge > 120;

  if (both) {
    const discMult = anyStale ? 0.4 : 1.0;

    const tempSpread = Math.abs(aemet.temperatureC - om.temperatureC);
    const tempTol = tolerances.temperature ?? 1.5;
    const tempPenalty = Math.min(24, (24 * tempSpread) / (tempTol * 3)) * discMult;
    if (tempPenalty > 0.5) {
      totalPenalty += tempPenalty;
      penalties.push(`temp_delta=${tempSpread.toFixed(1)} penalty=${tempPenalty.toFixed(1)}`);
    }

    const humSpread = Math.abs(aemet.humidityPct - om.humidityPct);
    const humTol = tolerances.humidity ?? 10;
    const humPenalty = Math.min(12, (12 * humSpread) / (humTol * 3)) * discMult;
    if (humPenalty > 0.5) {
      totalPenalty += humPenalty;
      penalties.push(`humidity_delta=${humSpread.toFixed(1)} penalty=${humPenalty.toFixed(1)}`);
    }

    const windSpread = Math.abs(aemet.windSpeedKmh - om.windSpeedKmh);
    const windTol = tolerances.wind ?? 8;
    const windPenalty = Math.min(12, (12 * windSpread) / (windTol * 3)) * discMult;
    if (windPenalty > 0.5) {
      totalPenalty += windPenalty;
      penalties.push(`wind_delta=${windSpread.toFixed(1)} penalty=${windPenalty.toFixed(1)}`);
    }

    const precipSpread = Math.abs(aemet.precipitationMm - om.precipitationMm);
    const precipTol = tolerances.precipitation ?? 1;
    const precipPenalty = Math.min(12, (12 * precipSpread) / (precipTol * 3)) * discMult;
    if (precipPenalty > 0.5) {
      totalPenalty += precipPenalty;
      penalties.push(`precip_delta=${precipSpread.toFixed(1)} penalty=${precipPenalty.toFixed(1)}`);
    }
  }

  for (const source of sources) {
    const age = source.dataAgeMinutes;
    if (source.source === "AEMET") {
      const agePenalty = Math.min(15, Math.max(0, age - 120) / 12);
      if (agePenalty > 0.5) {
        totalPenalty += agePenalty;
        penalties.push(`AEMET_age=${age.toFixed(0)}min penalty=${agePenalty.toFixed(1)}`);
      }
    }
  }

  if (both) {
    const timeDiff = Math.abs(omAge - aemetAge);
    const alignmentPenalty = Math.min(10, timeDiff / 30);
    if (alignmentPenalty > 0.5) {
      totalPenalty += alignmentPenalty;
      penalties.push(`time_diff=${timeDiff.toFixed(0)}min penalty=${alignmentPenalty.toFixed(1)}`);
    }
  }

  if (both) {
    const q1 = aemet.qualityScore;
    const q2 = om.qualityScore;
    const qualityFactor = anyStale ? 6 : 12;
    const qualityPenalty = Math.max(0, 2 - q1 - q2) * qualityFactor;
    if (qualityPenalty > 0.5) {
      totalPenalty += qualityPenalty;
      penalties.push(`source_quality(q1=${q1},q2=${q2}) penalty=${qualityPenalty.toFixed(1)}`);
    }
  }

  const staleCache = sources.some((s) => s.retrievalStatus === "STALE_CACHE");
  if (staleCache) {
    totalPenalty -= 8;
    penalties.push(`stale_bonus=-8`);
  }

  const confidence = Math.max(25, BASE_CONFIDENCE - totalPenalty);
  const explanation = penalties.length > 0 ? penalties.join("; ") : "no_penalties";

  return { confidencePct: Math.round(confidence), explanation };
}
