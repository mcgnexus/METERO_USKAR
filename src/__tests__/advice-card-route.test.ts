import { vi, describe, it, expect, beforeAll } from "vitest";

const { mockGetClimateCalibration, mockGetCurrentWeather, mockGeneralAdvice, mockClothingAdvice, mockWalkingAdvice, mockSharp } = vi.hoisted(() => ({
  mockGetClimateCalibration: vi.fn(),
  mockGetCurrentWeather: vi.fn(),
  mockGeneralAdvice: vi.fn(),
  mockClothingAdvice: vi.fn(),
  mockWalkingAdvice: vi.fn(),
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
vi.mock("@/lib/weather-advice/generalAdvice", () => ({
  generalAdvice: mockGeneralAdvice,
}));
vi.mock("@/lib/weather-advice/clothingAdvice", () => ({
  clothingAdvice: mockClothingAdvice,
}));
vi.mock("@/lib/weather-advice/walkingAdvice", () => ({
  walkingAdvice: mockWalkingAdvice,
}));
vi.mock("sharp", () => ({ default: mockSharp }));

import { GET } from "@/app/api/cards/advice/route";

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
    hourly: { temperatureC: [], humidityPct: [], precipitationProbabilityPct: [20], precipitationMm: [0.5], weatherCode: [], windSpeedKmh: [], windGustKmh: [], windDirectionDeg: [], visibilityM: [], time: [] },
    daily: { temperatureMaxC: [32], temperatureMinC: [16] },
    alerts: [], sources: [], sourceHealth: [], comparisonHourly: {} as any,
    ...overrides,
  };
}

describe("GET /api/cards/advice", () => {
  beforeAll(() => {
    mockGetClimateCalibration.mockResolvedValue(mockClimateData());
    mockGetCurrentWeather.mockResolvedValue(mockWeatherData());
    mockGeneralAdvice.mockReturnValue({ title: "Buen tiempo", label: "Dia agradable, sin precipitaciones" });
    mockClothingAdvice.mockReturnValue({ title: "Ropa ligera", label: "Camiseta y pantalon corto" });
    mockWalkingAdvice.mockReturnValue({ title: "Paseo", label: "Buen momento para pasear" });
  });

  it("returns 200 with image/png for ig platform", async () => {
    const req = new Request("http://localhost:3000/api/cards/advice?platform=ig");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 for og platform", async () => {
    const req = new Request("http://localhost:3000/api/cards/advice?platform=og");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 for story platform", async () => {
    const req = new Request("http://localhost:3000/api/cards/advice?platform=story");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("defaults to ig when no platform param", async () => {
    const req = new Request("http://localhost:3000/api/cards/advice");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("includes advice content in generated SVG", async () => {
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/advice?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Meteo Huescar");
    expect(svg).toContain("CONSEJOS DEL DIA");
    expect(svg).toContain("Dia agradable");
  });

  it("includes fire risk and ET0 sections when data present", async () => {
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/advice?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Riesgo incendio");
    expect(svg).toContain("ET0");
    expect(svg).toContain("mm");
  });

  it("shows frost risk when applicable", async () => {
    mockGetClimateCalibration.mockResolvedValueOnce(mockClimateData({
      dewPoint: { dewPointC: -2, frostRisk: "alta", blackFrostRisk: true },
      calibration: { realTemperatureC: 2 },
    }));
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/advice?platform=ig");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("Helada");
    expect(svg).toContain("Alto");
  });

  it("returns fallback when services fail", async () => {
    mockGetClimateCalibration.mockRejectedValueOnce(new Error("fail"));
    const req = new Request("http://localhost:3000/api/cards/advice?platform=ig");
    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
  });

  it("generates different dimensions for story platform", async () => {
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/advice?platform=story");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("width=\"1080\"");
    expect(svg).toContain("height=\"1920\"");
  });

  it("generates 1200x630 for og platform", async () => {
    mockSharp.mockClear();
    const req = new Request("http://localhost:3000/api/cards/advice?platform=og");
    await GET(req);
    const svg = mockSharp.mock.calls[0][0].toString("utf-8");
    expect(svg).toContain("width=\"1200\"");
    expect(svg).toContain("height=\"630\"");
  });
});
