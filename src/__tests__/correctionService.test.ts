import { vi, describe, it, expect } from "vitest";

vi.mock("@/services/modelParameterService", () => ({
  getModelParam: (key: string) => {
    const defaults: Record<string, number> = {
      altitude_lapse_rate: 0.006,
      night_inversion_valley: -1.5,
      night_inversion_mixed: -0.5,
      wind_factor_valley: 0.7,
      wind_factor_plateau: 1.2,
    };
    return defaults[key] ?? 0;
  },
}));

import { applyMicroclimateCorrections } from "@/services/correctionService";
import type { ReliefData } from "@/services/reliefService";

const flatRelief: ReliefData = {
  centerElevation: 950,
  minElevation: 930,
  maxElevation: 970,
  elevationRange: 40,
  valleyExposure: 0.5,
  microclimate: "MIXED_RELIEF",
  slopePct: 2,
  aspect: "S",
  aspectDeg: 180,
  grid: [[930, 940, 950], [945, 950, 955], [960, 965, 970]],
};

const valleyRelief: ReliefData = {
  ...flatRelief,
  microclimate: "VALLEY",
  valleyExposure: 0.8,
  elevationRange: 200,
};

describe("applyMicroclimateCorrections", () => {
  it("corrige altitud cuando source ≠ target", () => {
    const r = applyMicroclimateCorrections(10, 50, 5, false, 1101, 953, null);
    expect(r.temperatureC).toBeCloseTo(10.888, 1);
    expect(r.corrections.altitudeCorrectionC).toBeCloseTo(0.888, 2);
  });

  it("no aplica corrección altitudinal si no se pasa sourceElev", () => {
    const r = applyMicroclimateCorrections(10, 50, 5, false, undefined, 953, null);
    expect(r.temperatureC).toBe(10);
  });

  it("aplica inversión nocturna en valle con viento calmo", () => {
    const r = applyMicroclimateCorrections(5, 60, 2, true, 953, 953, valleyRelief);
    expect(r.temperatureC).toBe(3.5); // 5 + (-1.5) = 3.5
    expect(r.corrections.nightInversionC).toBe(-1.5);
  });

  it("no aplica inversión si no es de noche", () => {
    const r = applyMicroclimateCorrections(5, 60, 2, false, 953, 953, valleyRelief);
    expect(r.temperatureC).toBe(5);
    expect(r.corrections.nightInversionC).toBeUndefined();
  });

  it("no aplica inversión si viento > 5 km/h", () => {
    const r = applyMicroclimateCorrections(5, 60, 8, true, 953, 953, valleyRelief);
    expect(r.temperatureC).toBe(5);
    expect(r.corrections.nightInversionC).toBeUndefined();
  });

  it("reduce viento en valle", () => {
    const r = applyMicroclimateCorrections(5, 60, 10, false, 953, 953, valleyRelief);
    expect(r.windSpeedKmh).toBeCloseTo(7, 0); // 10 * 0.7 = 7
    expect(r.corrections.windFactor).toBe(0.7);
  });

  it("corrige humedad por dew point cuando hay diferencial altitudinal", () => {
    const r = applyMicroclimateCorrections(10, 50, 5, false, 1101, 953, null);
    expect(r.humidityPct).not.toBe(50);
  });

  it("sin relieve ni diff altitud, devuelve valores casi idénticos", () => {
    const r = applyMicroclimateCorrections(20, 60, 5, false, 953, 953, null);
    expect(r.temperatureC).toBe(20);
    expect(r.windSpeedKmh).toBeCloseTo(5, 1);
    expect(r.humidityPct).toBeLessThanOrEqual(100);
  });
});
