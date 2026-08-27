import { vi, describe, it, expect, beforeEach } from "vitest";
import { cacheClear } from "@/lib/inMemoryCache";

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

describe("fetchNowcast", () => {
  beforeEach(() => {
    cacheClear();
  });

  it("no crashea cuando strikes está vacío (reduce guard)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    const result = await fetchNowcast(37.8, -2.5, undefined);

    // Debe completarse sin TypeError
    expect(result).toHaveProperty("level");
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

    await fetchNowcast(37.8, -2.5, undefined);

    const { cacheSet } = await import("@/lib/inMemoryCache");
    expect(cacheSet).toHaveBeenCalledWith("nowcast_precip", expect.anything(), expect.anything());
  });
});
