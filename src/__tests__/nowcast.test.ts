import { vi, describe, it, expect, beforeEach } from "vitest";
import { cacheClear } from "@/lib/inMemoryCache";
import type { LightningData } from "@/types/weather";

// Mock inMemoryCache para aislar pruebas de caché
vi.mock("@/lib/inMemoryCache", () => {
  const store = new Map<string, { data: unknown; timestamp: number; ttlMs: number }>();
  return {
    cacheGet: vi.fn((key: string) => {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() - entry.timestamp < entry.ttlMs) return entry.data;
      store.delete(key);
      return null;
    }),
    cacheSet: vi.fn((key: string, data: unknown, ttlMs: number) => {
      store.set(key, { data, timestamp: Date.now(), ttlMs });
    }),
    cacheClear: vi.fn(() => { store.clear(); }),
    cacheDelete: vi.fn((key: string) => { store.delete(key); }),
    cacheKeys: vi.fn(() => Array.from(store.keys())),
  };
});

vi.mock("@/lib/geo", () => ({
  haversineKm: vi.fn(() => 0),
  bearing: vi.fn(() => "N"),
  toRad: vi.fn((d: number) => d * Math.PI / 180),
  toDeg: vi.fn((r: number) => r * 180 / Math.PI),
}));

import { fetchNowcast } from "@/services/nowcastService";

const emptyLightning: LightningData = {
  active: false,
  level: "info",
  nearestStrikeKm: null,
  strikeCount: 0,
  strikes: [],
  lastCheckedAt: "2024-01-01T00:00:00.000Z",
  source: "blitzortung",
  message: "No activity",
};

const lightningWithNearStrike: LightningData = {
  active: true,
  level: "alerta",
  nearestStrikeKm: 15,
  strikeCount: 1,
  strikes: [{ distanceKm: 15, bearing: "NW", time: "2024-01-01T00:00:00.000Z", lat: 37.8, lon: -2.5 }],
  lastCheckedAt: "2024-01-01T00:00:00.000Z",
  source: "blitzortung",
  message: "Strike detected",
};

const lightningEmptyArray: LightningData = {
  active: true,
  level: "info",
  nearestStrikeKm: 20,
  strikeCount: 0,
  strikes: [],
  lastCheckedAt: "2024-01-01T00:00:00.000Z",
  source: "blitzortung",
  message: "No strikes",
};

describe("fetchNowcast - Bug 8: reduce guard", () => {
  beforeEach(() => {
    cacheClear();
  });

  it("no crashea cuando strikes está vacío (reduce guard)", async () => {
    // Mock fetch para que falle (así llegamos a la sección de rayos sin datos OM)
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await fetchNowcast(37.8, -2.5, undefined, lightningEmptyArray);

    // Debe completarse sin TypeError
    expect(result.stormDetected).toBe(false);
    expect(result.stormBearing).toBeNull();
    expect(result).toHaveProperty("level");
  });

  it("detecta tormenta cuando hay rayo cercano con strikes poblado", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await fetchNowcast(37.8, -2.5, undefined, lightningWithNearStrike);

    expect(result.stormDetected).toBe(true);
    expect(result.stormDistanceKm).toBe(15);
    expect(result.stormBearing).toBe("NW");
  });

  it("no detecta tormenta cuando rayo está lejos (> 30 km)", async () => {
    const farStrike: LightningData = {
      ...lightningWithNearStrike,
      nearestStrikeKm: 50,
      strikes: [{ distanceKm: 50, bearing: "S", time: "2024-01-01T00:00:00.000Z", lat: 37.8, lon: -2.5 }],
    };

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await fetchNowcast(37.8, -2.5, undefined, farStrike);
    expect(result.stormDetected).toBe(false);
  });
});

describe("fetchNowcast - Bug 4: no cachea en fallo", () => {
  beforeEach(() => {
    cacheClear();
  });

  it("no cachea resultado cuando fetch falla", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    // Primera llamada: falla
    const { cacheSet } = await import("@/lib/inMemoryCache");
    expect(cacheSet).not.toHaveBeenCalledWith("nowcast_precip", expect.anything(), expect.anything());
  });

  it("cachea resultado cuando fetch tiene éxito", async () => {
    const mockResponse = new Response(JSON.stringify({
      minutely_15: {
        time: ["2024-01-01T00:00:00Z", "2024-01-01T00:15:00Z"],
        precipitation: [0, 0.5],
      },
    }), { status: 200 });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

    await fetchNowcast(37.8, -2.5, undefined, emptyLightning);

    const { cacheSet } = await import("@/lib/inMemoryCache");
    expect(cacheSet).toHaveBeenCalledWith("nowcast_precip", expect.anything(), expect.anything());
  });
});
