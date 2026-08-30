import { describe, it, expect } from "vitest";
import {
  buildDataQualitySummary,
  aemetStatusLabel,
  localStationsStatusLabel,
  primarySourceLabel,
  qualityLabel,
} from "@/lib/dataQuality";
import type { SourceHealth, SourceObservation } from "@/types/weather";

function health(source: string, status: "OK" | "DEGRADED" | "ERROR"): SourceHealth {
  return { source: source as SourceHealth["source"], status, checkedAt: new Date().toISOString(), message: "" };
}

function obs(source: string, ageMin: number): SourceObservation {
  return {
    source: source as SourceObservation["source"],
    locationName: source,
    time: new Date(Date.now() - ageMin * 60000).toISOString(),
    observationPeriod: "current",
    dataAgeMinutes: ageMin,
    qualityScore: 1,
    status: "OK",
    temperatureC: 15,
    humidityPct: 50,
    precipitationMm: 0,
    windSpeedKmh: 5,
    windGustKmh: 10,
  };
}

describe("buildDataQualitySummary", () => {
  it("solo Open-Meteo fresco, AEMET caido, sin locales → calidad buena, fuente Open-Meteo, AEMET sin datos", () => {
    const summary = buildDataQualitySummary(
      [
        health("OPEN_METEO", "OK"),
        health("AEMET", "ERROR"),
        health("LOCAL_STATIONS", "ERROR"),
      ],
      [obs("OPEN_METEO", 10)],
    );

    expect(summary.quality).toBe("buena");
    expect(summary.primarySource).toBe("OPEN_METEO");
    expect(summary.aemet).toBe("sin_datos");
    expect(summary.localStations).toBe("no_configuradas");
    expect(summary.activeSourceCount).toBe(1);
    expect(summary.explanation).toContain("AEMET sin datos");
    expect(summary.explanation).toContain("no configuradas");
  });

  it("Open-Meteo + AEMET disponibles + locales → calidad buena, todas las fuentes activas", () => {
    const summary = buildDataQualitySummary(
      [
        health("OPEN_METEO", "OK"),
        health("AEMET", "OK"),
        health("LOCAL_STATIONS", "OK"),
      ],
      [obs("OPEN_METEO", 5), obs("AEMET", 15), obs("LOCAL_STATIONS", 8)],
    );

    expect(summary.quality).toBe("buena");
    expect(summary.aemet).toBe("disponible");
    expect(summary.localStations).toBe("configuradas");
    expect(summary.activeSourceCount).toBe(3);
  });

  it("Open-Meteo sin observacion pero salud OK → cuenta como activo", () => {
    const summary = buildDataQualitySummary(
      [health("OPEN_METEO", "OK"), health("AEMET", "ERROR"), health("LOCAL_STATIONS", "ERROR")],
      [],
    );

    expect(summary.primarySource).toBe("NONE");
    expect(summary.quality).toBe("baja");
    expect(summary.activeSourceCount).toBe(0);
  });

  it("ninguna fuente disponible → calidad baja y explicación clara", () => {
    const summary = buildDataQualitySummary(
      [health("OPEN_METEO", "ERROR"), health("AEMET", "ERROR"), health("LOCAL_STATIONS", "ERROR")],
      [],
    );

    expect(summary.quality).toBe("baja");
    expect(summary.aemet).toBe("sin_datos");
    expect(summary.localStations).toBe("no_configuradas");
    expect(summary.explanation).toBe("No hay datos disponibles en este momento.");
  });

  it("fuente principal obsoleta (> 240 min) → calidad baja", () => {
    const summary = buildDataQualitySummary(
      [health("OPEN_METEO", "OK"), health("AEMET", "ERROR"), health("LOCAL_STATIONS", "ERROR")],
      [obs("OPEN_METEO", 300)],
    );

    expect(summary.quality).toBe("baja");
  });

  it("fuente principal media (120-240 min) → calidad media", () => {
    const summary = buildDataQualitySummary(
      [health("OPEN_METEO", "OK"), health("AEMET", "ERROR"), health("LOCAL_STATIONS", "ERROR")],
      [obs("OPEN_METEO", 180)],
    );

    expect(summary.quality).toBe("media");
  });

  it("AEMET degradada sin observacion → aemet degradada", () => {
    const summary = buildDataQualitySummary(
      [health("OPEN_METEO", "OK"), health("AEMET", "DEGRADED"), health("LOCAL_STATIONS", "ERROR")],
      [obs("OPEN_METEO", 5)],
    );

    expect(summary.aemet).toBe("degradada");
    expect(aemetStatusLabel("degradada")).toBe("Datos degradados");
  });
});

describe("labels", () => {
  it("qualityLabel", () => {
    expect(qualityLabel("buena")).toBe("Buena");
    expect(qualityLabel("media")).toBe("Media");
    expect(qualityLabel("baja")).toBe("Baja");
  });

  it("primarySourceLabel", () => {
    expect(primarySourceLabel("OPEN_METEO")).toBe("Open-Meteo");
    expect(primarySourceLabel("AEMET")).toBe("AEMET");
    expect(primarySourceLabel("LOCAL_STATIONS")).toBe("Miniestaciones");
    expect(primarySourceLabel("NONE")).toBe("Sin fuente");
  });

  it("aemetStatusLabel", () => {
    expect(aemetStatusLabel("disponible")).toBe("Datos disponibles");
    expect(aemetStatusLabel("sin_datos")).toBe("Sin datos disponibles");
  });

  it("localStationsStatusLabel", () => {
    expect(localStationsStatusLabel("configuradas")).toBe("Configuradas");
    expect(localStationsStatusLabel("no_configuradas")).toBe("No configuradas");
  });
});
