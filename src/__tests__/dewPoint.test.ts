import { describe, it, expect } from "vitest";
import { saturationVaporPressure, dewPoint, relativeHumidity } from "@/lib/dewPoint";

describe("saturationVaporPressure", () => {
  it("es 6.112 hPa a 0 °C", () => {
    expect(saturationVaporPressure(0)).toBeCloseTo(6.112, 2);
  });

  it("es ~23.37 hPa a 20 °C", () => {
    const e = saturationVaporPressure(20);
    expect(e).toBeGreaterThan(23);
    expect(e).toBeLessThan(24);
  });

  it("es ~56.13 hPa a 35 °C", () => {
    const e = saturationVaporPressure(35);
    expect(e).toBeGreaterThan(55);
    expect(e).toBeLessThan(57);
  });
});

describe("dewPoint", () => {
  it("retorna -273.15 si rh es 0", () => {
    expect(dewPoint(20, 0)).toBe(-273.15);
  });

  it("td ≈ T cuando rh = 100 %", () => {
    const td = dewPoint(25, 100);
    expect(td).toBeCloseTo(25, 0);
  });

  it("td < T cuando rh < 100 %", () => {
    const td = dewPoint(25, 50);
    expect(td).toBeLessThan(25);
    expect(td).toBeGreaterThan(10);
  });

  it("td decrece al bajar la humedad", () => {
    const td80 = dewPoint(30, 80);
    const td40 = dewPoint(30, 40);
    expect(td40).toBeLessThan(td80);
  });
});

describe("relativeHumidity", () => {
  it("100 % cuando td = T", () => {
    expect(relativeHumidity(20, 20)).toBeCloseTo(100, 0);
  });

  it("50 % cuando td ≈ 9.3 °C a T = 20 °C", () => {
    const rh = relativeHumidity(20, 9.3);
    expect(rh).toBeGreaterThan(45);
    expect(rh).toBeLessThan(55);
  });

  it("se satura en [0, 100]", () => {
    expect(relativeHumidity(20, 25)).toBeLessThanOrEqual(100);
    expect(relativeHumidity(20, -50)).toBeGreaterThanOrEqual(0);
  });
});
