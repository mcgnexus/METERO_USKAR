import { describe, it, expect } from "vitest";
import { calculateConsensusConfidence } from "@/services/consensusConfidence";
import type { SourceObservation } from "@/types/weather";

function makeObs(source: string, ageMin: number, quality = 1): SourceObservation {
  return {
    source: source as SourceObservation["source"],
    locationName: source,
    time: new Date(Date.now() - ageMin * 60000).toISOString(),
    observationPeriod: "current",
    dataAgeMinutes: ageMin,
    qualityScore: quality,
    status: "OK",
    temperatureC: 15,
    humidityPct: 50,
    precipitationMm: 0,
    windSpeedKmh: 5,
    windGustKmh: 10,
  };
}

describe("calculateConsensusConfidence", () => {
  const tolerances = { temperature: 1.5, humidity: 10, wind: 8, precipitation: 1 };

  it("fuente única no reporta el 92% completo (penalización por falta de cotejo)", () => {
    const { confidencePct, explanation } = calculateConsensusConfidence([makeObs("OPEN_METEO", 10)], tolerances);
    expect(confidencePct).toBeLessThan(92);
    expect(confidencePct).toBe(77);
    expect(explanation).toContain("single_source_no_crosscheck");
  });

  it("dos fuentes que coinciden mantienen la confianza alta", () => {
    const { confidencePct } = calculateConsensusConfidence(
      [makeObs("OPEN_METEO", 10), makeObs("AEMET", 10)],
      tolerances
    );
    expect(confidencePct).toBeGreaterThanOrEqual(80);
    expect(confidencePct).toBeLessThanOrEqual(92);
  });

  it("datos obsoletos en caché reducen la confianza", () => {
    const stale = makeObs("OPEN_METEO", 10);
    stale.retrievalStatus = "STALE_CACHE";
    const { confidencePct } = calculateConsensusConfidence([stale], tolerances);
    expect(confidencePct).toBe(72);
  });
});
