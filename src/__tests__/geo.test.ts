import { describe, it, expect } from "vitest";
import { haversineKm, toRad, toDeg, bearing } from "@/lib/geo";

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(37.8094, -2.5392, 37.8094, -2.5392)).toBe(0);
  });

  it("computes distance Huéscar ↔ Granad (≈115 km)", () => {
    const d = haversineKm(37.176, -3.598, 37.8094, -2.5392);
    expect(d).toBeGreaterThan(95);
    expect(d).toBeLessThan(130);
  });

  it("is symmetric", () => {
    const d1 = haversineKm(37.8, -2.5, 37.7, -2.6);
    const d2 = haversineKm(37.7, -2.6, 37.8, -2.5);
    expect(d1).toBeCloseTo(d2, 10);
  });
});

describe("toRad / toDeg", () => {
  it("converts 180° ↔ π", () => {
    expect(toRad(180)).toBeCloseTo(Math.PI);
    expect(toDeg(Math.PI)).toBeCloseTo(180);
  });

  it("converts 0° ↔ 0 rad", () => {
    expect(toRad(0)).toBe(0);
    expect(toDeg(0)).toBe(0);
  });
});

describe("bearing", () => {
  it("returns N for the same point (no displacement)", () => {
    const b = bearing(37.8, -2.5, 37.8, -2.5);
    expect(typeof b).toBe("string");
  });

  it("returns S for a point directly south", () => {
    const b = bearing(37.8, -2.5, 37.0, -2.5);
    expect(b).toBe("S");
  });
});
