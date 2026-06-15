import { describe, it, expect } from "vitest";
import { parseCoord } from "@/lib/coords";

describe("parseCoord", () => {
  it("retorna default si value es null", () => {
    expect(parseCoord(null, 37.8)).toBe(37.8);
  });

  it("retorna default si value es cadena vacía", () => {
    expect(parseCoord("", 37.8)).toBe(37.8);
  });

  it("retorna default si value es solo espacios", () => {
    expect(parseCoord("   ", 37.8)).toBe(37.8);
  });

  it("parsea número válido", () => {
    expect(parseCoord("37.8094", 0)).toBeCloseTo(37.8094, 4);
  });

  it("parsea 0 correctamente (no cae a default)", () => {
    expect(parseCoord("0", 37.8)).toBe(0);
  });

  it("retorna default si es NaN", () => {
    expect(parseCoord("abc", 37.8)).toBe(37.8);
  });

  it("retorna default si es Infinity", () => {
    expect(parseCoord("Infinity", 37.8)).toBe(37.8);
  });

  it("retorna default si es -Infinity", () => {
    expect(parseCoord("-Infinity", 37.8)).toBe(37.8);
  });
});
