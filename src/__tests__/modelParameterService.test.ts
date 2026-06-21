import { vi, describe, it, expect, beforeEach } from "vitest";

const mockGetAllModelParameters = vi.fn();

vi.mock("@/lib/weatherStore", () => ({
  getAllModelParameters: (...args: unknown[]) => mockGetAllModelParameters(...args),
}));

import { getModelParam, refreshRuntimeParameters } from "@/services/modelParameterService";
import { cacheClear } from "@/lib/inMemoryCache";

describe("getModelParam", () => {
  beforeEach(() => {
    cacheClear();
    vi.clearAllMocks();
  });

  it("retorna default antes de refreshRuntimeParameters", () => {
    expect(getModelParam("altitude_lapse_rate")).toBe(0.0065);
  });

  it("retorna valor de DB tras refreshRuntimeParameters", async () => {
    mockGetAllModelParameters.mockResolvedValue({
      altitude_lapse_rate: { value: 0.007, previousValue: 0.0065, sampleCount: 50 },
      reservoir_temp_bias_day: { value: -0.3, previousValue: -0.3, sampleCount: 30 },
    });

    await refreshRuntimeParameters();

    expect(getModelParam("altitude_lapse_rate")).toBe(0.007);
    expect(getModelParam("reservoir_temp_bias_day")).toBe(-0.3);
    expect(getModelParam("wind_factor_valley")).toBe(0.7);
  });

  it("vuelve a defaults si DB falla", async () => {
    mockGetAllModelParameters.mockRejectedValue(new Error("DB down"));

    await refreshRuntimeParameters();

    expect(getModelParam("altitude_lapse_rate")).toBe(0.0065);
    expect(getModelParam("reservoir_temp_bias_day")).toBe(-0.3);
  });

  it("ignora NaN de DB y mantiene default", async () => {
    mockGetAllModelParameters.mockResolvedValue({
      altitude_lapse_rate: { value: NaN, previousValue: 0.0065, sampleCount: 10 },
    });

    await refreshRuntimeParameters();

    expect(getModelParam("altitude_lapse_rate")).toBe(0.0065);
  });
});
