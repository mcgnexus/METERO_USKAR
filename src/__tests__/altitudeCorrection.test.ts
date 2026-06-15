import { vi, describe, it, expect } from "vitest";

// Mock modelParameterService para aislar la función de prueba
const mockParams: Record<string, number> = {
  altitude_lapse_rate: 0.006,
};

vi.mock("@/services/modelParameterService", () => ({
  getModelParam: (key: string) => mockParams[key] ?? 0,
}));

import { correctTemperatureByAltitude } from "@/services/altitudeCorrection";

describe("correctTemperatureByAltitude", () => {
  it("no corrige si source == target", () => {
    const result = correctTemperatureByAltitude(15, 1000, 1000);
    expect(result.correctedTemperature).toBe(15);
    expect(result.correction).toBe(0);
  });

  it("enfría si target es más alto (source < target)", () => {
    // 500 m → 1000 m: diferencia = 500 m, lapso = 0.006 → -3 °C
    const result = correctTemperatureByAltitude(20, 500, 1000);
    expect(result.correctedTemperature).toBeCloseTo(17, 1);
    expect(result.correction).toBeCloseTo(-3, 1);
  });

  it("calienta si target es más bajo (source > target)", () => {
    // 1101 m → 953 m: diferencia = 148 m, lapso = 0.006 → +0.888 °C
    const result = correctTemperatureByAltitude(10, 1101, 953);
    expect(result.correction).toBeCloseTo(0.888, 2);
    expect(result.correctedTemperature).toBeCloseTo(10.888, 2);
  });

  it("refleja cambios en el lapse rate via getModelParam", () => {
    mockParams.altitude_lapse_rate = 0.009; // más abrupto
    const result = correctTemperatureByAltitude(20, 500, 1000);
    expect(result.correction).toBeCloseTo(-4.5, 1);
    // restaurar
    mockParams.altitude_lapse_rate = 0.006;
  });

  it("valores típicos Huéscar: AEMET 1101 m → urbano 953 m", () => {
    // En invierno a 5 °C en la estación AEMET, el casco urbano estaría ~0.9 °C más cálido
    const result = correctTemperatureByAltitude(5, 1101, 953);
    expect(result.correctedTemperature).toBeCloseTo(5.888, 2);
  });
});
