import { describe, it, expect } from "vitest";
import { thiLevel, temperatureColor, windDirection } from "@/lib/display";

describe("thiLevel", () => {
  it("retorna Ninguno para THI < 68", () => {
    expect(thiLevel(60)).toBe("Ninguno");
    expect(thiLevel(67.9)).toBe("Ninguno");
  });

  it("retorna Leve para 68 ≤ THI < 72", () => {
    expect(thiLevel(68)).toBe("Leve");
    expect(thiLevel(71)).toBe("Leve");
  });

  it("retorna Moderado para 72 ≤ THI < 80", () => {
    expect(thiLevel(72)).toBe("Moderado");
    expect(thiLevel(79)).toBe("Moderado");
  });

  it("retorna Severo para 80 ≤ THI < 90", () => {
    expect(thiLevel(80)).toBe("Severo");
    expect(thiLevel(89)).toBe("Severo");
  });

  it("retorna Peligroso para THI ≥ 90", () => {
    expect(thiLevel(90)).toBe("Peligroso");
    expect(thiLevel(100)).toBe("Peligroso");
  });
});

describe("temperatureColor", () => {
  it("retorna rojo intenso para ≥ 40 °C", () => {
    expect(temperatureColor(40)).toBe("#dc2626");
    expect(temperatureColor(45)).toBe("#dc2626");
  });

  it("retorna azul para 0 °C", () => {
    expect(temperatureColor(0)).toBe("#3b82f6");
  });

  it("retorna violeta para < 0 °C", () => {
    expect(temperatureColor(-5)).toBe("#8b5cf6");
  });
});

describe("windDirection", () => {
  it("retorna N para 0°", () => {
    expect(windDirection(0)).toBe("N");
  });

  it("retorna S para 180°", () => {
    expect(windDirection(180)).toBe("S");
  });

  it("retorna E para 90°", () => {
    expect(windDirection(90)).toBe("E");
  });
});
