import { describe, it, expect } from "vitest";
import {
  maxAgeMinutes,
  ageMinutes,
  resolveDataSourceStatus,
  needsAttention,
  anyAttention,
  effectiveQualityLabel,
  SOURCE_MAX_AGE_MINUTES_BY_TYPE,
} from "@/lib/sourceValidity";

const NOW = Date.parse("2026-09-08T12:00:00Z");

function iso(minutesAgo: number): string {
  return new Date(NOW - minutesAgo * 60000).toISOString();
}

describe("sourceValidity: tiempos máximos de validez por fuente", () => {
  it("define un límite por tipo de fuente", () => {
    expect(SOURCE_MAX_AGE_MINUTES_BY_TYPE.forecast).toBeGreaterThan(0);
    expect(SOURCE_MAX_AGE_MINUTES_BY_TYPE["local-sensor"]).toBeGreaterThan(0);
    expect(SOURCE_MAX_AGE_MINUTES_BY_TYPE["official-alert"]).toBeGreaterThan(0);
    expect(SOURCE_MAX_AGE_MINUTES_BY_TYPE.phytosanitary).toBeGreaterThan(0);
  });

  it("maxAgeMinutes devuelve el límite del tipo", () => {
    expect(maxAgeMinutes("forecast")).toBe(SOURCE_MAX_AGE_MINUTES_BY_TYPE.forecast);
  });

  it("ageMinutes calcula la antigüedad en minutos", () => {
    expect(ageMinutes(iso(30), NOW)).toBeCloseTo(30, 5);
    expect(ageMinutes("no-es-fecha", NOW)).toBe(Infinity);
  });
});

describe("sourceValidity: resolución de estado temporal", () => {
  it("ERROR siempre es unavailable aunque la lectura sea reciente", () => {
    expect(
      resolveDataSourceStatus({ type: "local-sensor", updatedAt: iso(1), health: "ERROR", nowMs: NOW })
    ).toBe("unavailable");
  });

  it("DEGRADED siempre es stale", () => {
    expect(
      resolveDataSourceStatus({ type: "forecast", updatedAt: iso(1), health: "DEGRADED", nowMs: NOW })
    ).toBe("stale");
  });

  it("dato reciente y OK es active", () => {
    expect(
      resolveDataSourceStatus({ type: "local-sensor", updatedAt: iso(5), health: "OK", nowMs: NOW })
    ).toBe("active");
  });

  it("dato más viejo que el límite es stale aunque la consulta fuera OK", () => {
    // sensor local: límite 60 min -> 90 min debe quedar desactualizado
    expect(
      resolveDataSourceStatus({ type: "local-sensor", updatedAt: iso(90), health: "OK", nowMs: NOW })
    ).toBe("stale");
  });

  it("respetar el límite de cada tipo (forecast 180, sensor 60)", () => {
    expect(
      resolveDataSourceStatus({ type: "forecast", updatedAt: iso(170), health: "OK", nowMs: NOW })
    ).toBe("active");
    expect(
      resolveDataSourceStatus({ type: "local-sensor", updatedAt: iso(170), health: "OK", nowMs: NOW })
    ).toBe("stale");
  });
});

describe("sourceValidity: helpers de aviso y calidad", () => {
  it("needsAttention solo marca stale/unavailable", () => {
    expect(needsAttention("active")).toBe(false);
    expect(needsAttention("stale")).toBe(true);
    expect(needsAttention("unavailable")).toBe(true);
  });

  it("anyAttention detecta cualquier fuente con aviso", () => {
    expect(anyAttention(["active", "stale"])).toBe(true);
    expect(anyAttention(["active", "active"])).toBe(false);
  });

  it("evita mostrar 'Buena' cuando hay una fuente desactualizada", () => {
    expect(effectiveQualityLabel("buena", true)).not.toContain("Buena");
    expect(effectiveQualityLabel("buena", false)).toBe("Buena");
    expect(effectiveQualityLabel("media", true)).toBe("Media");
  });
});
