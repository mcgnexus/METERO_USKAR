import { vi, describe, it, expect, beforeAll } from "vitest";

const { mockGetClimateCalibration, mockGetCurrentWeather, mockSharp } = vi.hoisted(() => ({
  mockGetClimateCalibration: vi.fn(),
  mockGetCurrentWeather: vi.fn(),
  mockSharp: vi.fn(() => ({
    png: vi.fn(() => ({
      toBuffer: vi.fn(() => Promise.resolve(Buffer.from("fake-png-bytes"))),
    })),
  })),
}));

vi.mock("@/services/climateCalibrationPayloadService", () => ({
  getClimateCalibrationPayload: mockGetClimateCalibration,
}));
vi.mock("@/services/currentWeatherService", () => ({
  getCurrentWeatherPayload: mockGetCurrentWeather,
}));
vi.mock("sharp", () => ({ default: mockSharp }));

import { GET } from "@/app/api/daily-card/route";

function mockClimateData(overrides: Record<string, any> = {}) {
  return {
    location: { id: "huescar", name: "Huéscar", lat: 37.81, lon: -2.54, elevation: 953 },
    generatedAt: "2026-06-28T10:00:00Z",
    calibration: { realTemperatureC: 28, residualC: null, residualDefinition: "estimated_minus_real", canTrainModel: false },
    interpolation: { inversionDetected: false, dynamicGradientCPerM: 0.006, dynamicGradientCPer100m: 0.6, estimatedTemperatureC: 28, formula: "standard" },
    dewPoint: { dewPointC: 10, frostRisk: "none", blackFrostRisk: false },
    eto: { etoHourlyMm: 0.35, method: "FAO56_HOURLY_PM" as const, inputs: { temperatureC: 28, humidityPct: 40, pressureKPa: 90, solarRadiationWm2: 800, netRadiationMJm2h: 2.5, windSpeed2mMs: 3 } },
    nodes: {
      baza: {} as any, sanClemente: {} as any,
      localStation: { humidityPct: 40 },
      radiationWind: { windSpeed2mKmh: 20 },
    },
    extrapolation: { bazaWindDirectionDeg: 180 },
    exoticVariables: { cloudCoverPct: 30 },
    microclimate: {} as any,
    ...overrides,
  };
}

function mockWeatherData(overrides: Record<string, any> = {}) {
  return {
    location: "Huéscar", latitude: 37.81, longitude: -2.54, elevation: 953,
    timezone: "Europe/Madrid", source: "FUSED", fetchedAt: "2026-06-28T10:00:00Z",
    confidencePct: 85, confidenceExplanation: "ok",
    current: { weatherCode: 2, apparentTemperatureC: 26, humidityPct: 40, windGustKmh: 25, windDirectionDeg: 180, temperatureC: 28 },
    hourly: { temperatureC: [], humidityPct: [], precipitationProbabilityPct: [20], precipitationMm: [], weatherCode: [], windSpeedKmh: [], windGustKmh: [], windDirectionDeg: [], visibilityM: [], time: [] },
    daily: { temperatureMaxC: [32], temperatureMinC: [16] },
    alerts: [], sources: [], sourceHealth: [], comparisonHourly: {} as any,
    ...overrides,
  };
}

describe("GET /api/daily-card", () => {
  beforeAll(() => {
    mockGetClimateCalibration.mockResolvedValue(mockClimateData());
    mockGetCurrentWeather.mockResolvedValue(mockWeatherData());
  });

  it("returns 200 with image/png when data is available", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("sets cache headers", async () => {
    const response = await GET();
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("returns fallback when climate service fails", async () => {
    mockGetClimateCalibration.mockRejectedValueOnce(new Error("service down"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns fallback when weather service fails", async () => {
    mockGetCurrentWeather.mockRejectedValueOnce(new Error("service down"));
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns fallback when both services return null", async () => {
    mockGetClimateCalibration.mockResolvedValueOnce(null);
    mockGetCurrentWeather.mockResolvedValueOnce(null);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("calls sharp with valid SVG", async () => {
    mockSharp.mockClear();
    await GET();
    const sharpInput = mockSharp.mock.calls[0]?.[0];
    expect(sharpInput).toBeInstanceOf(Buffer);
    const svg = sharpInput.toString("utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("Meteo Huescar");
    expect(svg).toContain("meteo.tecrural.es");
  });

  it("includes temperature data in generated SVG", async () => {
    await GET();
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("32");
    expect(svg).toContain("16");
  });

  it("includes AEMET alerts section when alerts are present", async () => {
    mockGetCurrentWeather.mockResolvedValueOnce(mockWeatherData({
      alerts: [{ type: "meteorologica", level: "severo", title: "Lluvias intensas", message: "Alert message" }],
    }));
    mockSharp.mockClear();
    await GET();
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Alerta AEMET");
    expect(svg).toContain("Lluvias intensas");
  });
});
