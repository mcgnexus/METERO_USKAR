import { vi, describe, it, expect, beforeAll } from "vitest";

const { mockGetClimateCalibration, mockGetCurrentWeather, mockBuildAlarms, mockSharp } = vi.hoisted(() => ({
  mockGetClimateCalibration: vi.fn(),
  mockGetCurrentWeather: vi.fn(),
  mockBuildAlarms: vi.fn(),
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
vi.mock("@/components/llano/alarms-logic", () => ({
  buildAlarms: mockBuildAlarms,
  levelLabel: (lvl: string) => {
    const labels: Record<string, string> = { critico: "CRITICO", precaucion: "PRECAUCION", aviso: "AVISO", info: "INFO" };
    return labels[lvl] ?? lvl;
  },
}));
vi.mock("sharp", () => ({ default: mockSharp }));

import { GET } from "@/app/api/cards/alert/route";

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
    agricultural: {} as any,
    ...overrides,
  };
}

describe("GET /api/cards/alert", () => {
  beforeAll(() => {
    mockGetClimateCalibration.mockResolvedValue(mockClimateData());
    mockGetCurrentWeather.mockResolvedValue(mockWeatherData());
  });

  it("returns 200 with image/png when critical alarms exist", async () => {
    mockBuildAlarms.mockReturnValue([
      { id: "1", level: "critico", title: "Helada inminente", message: "Temperaturas bajo cero esperadas esta noche. Proteger cultivos.", source: "frost", timestamp: new Date().toISOString(), category: "frost" },
    ]);
    const req = new Request("http://localhost:3000/api/cards/alert?platform=ig");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("shows alarm content in generated SVG", async () => {
    mockBuildAlarms.mockReturnValue([
      { id: "1", level: "critico", title: "Helada inminente", message: "Temperaturas bajo cero esperadas esta noche. Proteger cultivos.", source: "frost", timestamp: "2026-06-28T22:00:00Z", category: "frost" },
    ]);
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/alert?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("CRITICO");
    expect(svg).toContain("Helada inminente");
    expect(svg).toContain("Temperaturas bajo cero");
  });

  it("shows sin alertas activas when no critical/precaucion alarms", async () => {
    mockBuildAlarms.mockReturnValue([
      { id: "2", level: "info", title: "Info menor", message: "Sin relevancia", source: "general", timestamp: "2026-06-28T10:00:00Z", category: "general" },
    ]);
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/alert?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Sin alertas activas");
  });

  it("shows datos no disponibles when services fail", async () => {
    mockGetClimateCalibration.mockRejectedValueOnce(new Error("fail"));
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/alert?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Datos no disponibles");
  });

  it("returns 200 for og platform", async () => {
    mockBuildAlarms.mockReturnValue([]);
    const req = new Request("http://localhost:3000/api/cards/alert?platform=og");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 for story platform", async () => {
    mockBuildAlarms.mockReturnValue([]);
    const req = new Request("http://localhost:3000/api/cards/alert?platform=story");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("defaults to ig when no platform param", async () => {
    mockBuildAlarms.mockReturnValue([]);
    const req = new Request("http://localhost:3000/api/cards/alert");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("includes temperature, wind and humidity in footer", async () => {
    mockBuildAlarms.mockReturnValue([]);
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/alert?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Temp");
    expect(svg).toContain("Viento");
    expect(svg).toContain("Humedad");
    expect(svg).toContain("28");
  });

  it("handles multiple alarms", async () => {
    mockBuildAlarms.mockReturnValue([
      { id: "1", level: "critico", title: "Helada", message: "Riesgo alto de helada", source: "frost", timestamp: "2026-06-28T22:00:00Z", category: "frost" },
      { id: "2", level: "precaucion", title: "Viento fuerte", message: "Rachas de hasta 60 km/h", source: "wind", timestamp: "2026-06-28T14:00:00Z", category: "wind" },
    ]);
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/alert?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Helada");
    expect(svg).toContain("Viento fuerte");
  });
});
