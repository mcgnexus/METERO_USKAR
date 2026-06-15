import { describe, it, expect } from "vitest";
import { computeLivestockData } from "@/services/livestockService";
import { saturationVaporPressure } from "@/lib/dewPoint";

/**
 * Verifica que computeTHI usa saturationVaporPressure de dewPoint
 * como fuente única de la constante de Magnus (17.62/243.12).
 */

describe("computeLivestockData", () => {
  it("retorna level ninguno con THI bajo", () => {
    const result = computeLivestockData(10, 40);
    expect(result.level).toBe("ninguno");
    expect(result.thi).toBeLessThan(68);
  });

  it("retorna leve en condiciones templadas", () => {
    const result = computeLivestockData(22, 50);
    expect(["ninguno", "leve"]).toContain(result.level);
    expect(result.affectedLivestock).toBeTruthy();
  });

  it("retorna severo o peligroso en calor extremo", () => {
    const result = computeLivestockData(38, 80);
    expect(["severo", "peligroso"]).toContain(result.level);
  });

  it("THI calculado con Magnus unificada coincide con dewPoint", () => {
    // Verificar que e_kpa = (rh/100) * saturationVaporPressure(T) / 10
    // es la fuente usada.
    const T = 25;
    const RH = 60;
    const e_kpa = (RH / 100) * saturationVaporPressure(T) / 10;
    const expectedThi = T + 0.36 * e_kpa + 41.2;
    const result = computeLivestockData(T, RH);
    expect(result.thi).toBeCloseTo(expectedThi, 1);
  });

  it("valores simétricos: misma T, RH distinta produce THI distinto", () => {
    const a = computeLivestockData(30, 30);
    const b = computeLivestockData(30, 80);
    expect(b.thi).toBeGreaterThan(a.thi);
  });
});
