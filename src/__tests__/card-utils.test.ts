import { describe, it, expect, afterEach, vi } from "vitest";
import {
  ascii, platformSize, platformLabel, weatherIcon,
  windDirLabel, weatherDesc, formatDateLong, fireRiskLevel, CARD_COLORS,
} from "@/lib/card-utils";

describe("ascii", () => {
  it("removes diacritics from accented characters", () => {
    expect(ascii("é")).toBe("e");
    expect(ascii("ñ")).toBe("n");
    expect(ascii("ü")).toBe("u");
    expect(ascii("ç")).toBe("c");
    expect(ascii("España")).toBe("Espana");
    expect(ascii("café con ñoquis")).toBe("cafe con noquis");
  });

  it("removes non-ASCII characters like degree symbol", () => {
    expect(ascii("°")).toBe("");
    expect(ascii("•")).toBe("");
    expect(ascii("25°C")).toBe("25C");
    expect(ascii("≈")).toBe("");
  });

  it("passes through plain ASCII strings unchanged", () => {
    expect(ascii("hello world")).toBe("hello world");
    expect(ascii("Meteo Huescar 2024")).toBe("Meteo Huescar 2024");
    expect(ascii("")).toBe("");
  });

  it("handles mixed ASCII and non-ASCII", () => {
    expect(ascii("Meteo Huéscar — 25°C")).toBe("Meteo Huescar  25C");
  });
});

describe("platformSize", () => {
  it("returns 1080x1080 for ig", () => {
    expect(platformSize("ig")).toEqual({ width: 1080, height: 1080 });
  });

  it("returns 1200x630 for og", () => {
    expect(platformSize("og")).toEqual({ width: 1200, height: 630 });
  });

  it("returns 1080x1920 for story", () => {
    expect(platformSize("story")).toEqual({ width: 1080, height: 1920 });
  });

  it("defaults to 1080x1080 for unknown platform", () => {
    expect(platformSize("unknown" as any)).toEqual({ width: 1080, height: 1080 });
  });
});

describe("platformLabel", () => {
  it("returns Instagram/Redes for ig", () => {
    expect(platformLabel("ig")).toBe("Instagram / Redes");
  });

  it("returns Facebook/WhatsApp for og", () => {
    expect(platformLabel("og")).toBe("Facebook / WhatsApp");
  });

  it("returns Instagram/WhatsApp Story for story", () => {
    expect(platformLabel("story")).toBe("Instagram / WhatsApp Story");
  });
});

describe("weatherIcon", () => {
  it("returns sun for clear sky (code 0)", () => {
    expect(weatherIcon(0)).toBe("\u2600\uFE0F");
  });

  it("returns cloudy for codes 1-3", () => {
    expect(weatherIcon(1)).toBe("\u26C5");
    expect(weatherIcon(3)).toBe("\u26C5");
  });

  it("returns fog for codes 4-48", () => {
    expect(weatherIcon(10)).toBe("\uD83C\uDF2B\uFE0F");
    expect(weatherIcon(48)).toBe("\uD83C\uDF2B\uFE0F");
  });

  it("returns drizzle for codes 49-55", () => {
    expect(weatherIcon(51)).toBe("\uD83D\uDCA7");
    expect(weatherIcon(55)).toBe("\uD83D\uDCA7");
  });

  it("returns rain for codes 56-65", () => {
    expect(weatherIcon(61)).toBe("\uD83C\uDF27\uFE0F");
    expect(weatherIcon(65)).toBe("\uD83C\uDF27\uFE0F");
  });

  it("returns snow for codes 66-75", () => {
    expect(weatherIcon(71)).toBe("\u2744\uFE0F");
    expect(weatherIcon(75)).toBe("\u2744\uFE0F");
  });

  it("returns shower for codes 76-82", () => {
    expect(weatherIcon(80)).toBe("\uD83C\uDF26\uFE0F");
    expect(weatherIcon(82)).toBe("\uD83C\uDF26\uFE0F");
  });

  it("returns thunderstorm for codes 83-99", () => {
    expect(weatherIcon(95)).toBe("\u26C8\uFE0F");
    expect(weatherIcon(99)).toBe("\u26C8\uFE0F");
  });

  it("returns question mark for codes above 99", () => {
    expect(weatherIcon(100)).toBe("\u2753");
  });
});

describe("windDirLabel", () => {
  it("returns N for 0-11 deg", () => {
    expect(windDirLabel(0)).toBe("N");
    expect(windDirLabel(10)).toBe("N");
  });

  it("returns NNE for 22.5 deg", () => {
    expect(windDirLabel(22.5)).toBe("NNE");
  });

  it("returns E for 90 deg", () => {
    expect(windDirLabel(90)).toBe("E");
  });

  it("returns S for 180 deg", () => {
    expect(windDirLabel(180)).toBe("S");
  });

  it("returns W for 270 deg", () => {
    expect(windDirLabel(270)).toBe("W");
  });

  it("returns -- for null/undefined", () => {
    expect(windDirLabel(null)).toBe("--");
    expect(windDirLabel(undefined)).toBe("--");
  });

  it("wraps around correctly near 360", () => {
    expect(windDirLabel(360)).toBe("N");
    expect(windDirLabel(348.75)).toBe("N");
  });
});

describe("weatherDesc", () => {
  it("returns correct Spanish description for known codes", () => {
    expect(weatherDesc(0)).toBe("Despejado");
    expect(weatherDesc(1)).toBe("Mayormente despejado");
    expect(weatherDesc(3)).toBe("Nublado");
    expect(weatherDesc(45)).toBe("Niebla");
    expect(weatherDesc(61)).toBe("Lluvia ligera");
    expect(weatherDesc(95)).toBe("Tormenta");
  });

  it("returns Variable for unknown codes", () => {
    expect(weatherDesc(999)).toBe("Variable");
    expect(weatherDesc(-1)).toBe("Variable");
  });
});

describe("formatDateLong", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns correct Spanish date format for a known date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-28T12:00:00+02:00"));
    const result = formatDateLong();
    expect(result).toMatch(/^Domingo, \d{1,2} de junio$/);
    expect(result).toBe("Domingo, 28 de junio");
  });

  it("handles month boundaries correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00+01:00"));
    expect(formatDateLong()).toMatch(/Jueves, 1 de enero/);
  });
});

describe("fireRiskLevel", () => {
  function mockCd(overrides: Record<string, any>) {
    return {
      calibration: { realTemperatureC: null },
      interpolation: { estimatedTemperatureC: 20 },
      nodes: {
        localStation: { humidityPct: 50 },
        radiationWind: { windSpeed2mKmh: 15 },
      },
      eto: { inputs: { humidityPct: 50 } },
      exoticVariables: { cloudCoverPct: 50 },
      ...overrides,
    } as any;
  }

  it("returns BAJO for low score", () => {
    const cd = mockCd({});
    expect(fireRiskLevel(cd).level).toBe("BAJO");
    expect(fireRiskLevel(cd).color).toBe("#16a34a");
  });

  it("returns MODERADO for score 3-4", () => {
    const cd = mockCd({
      calibration: { realTemperatureC: 25 },
      nodes: { localStation: { humidityPct: 40 }, radiationWind: { windSpeed2mKmh: 15 } },
      eto: { inputs: { humidityPct: 40 } },
    });
    expect(fireRiskLevel(cd).level).toBe("MODERADO");
    expect(fireRiskLevel(cd).color).toBe("#eab308");
  });

  it("returns ALTO for score 5-6", () => {
    const cd = mockCd({
      calibration: { realTemperatureC: 30 },
      nodes: { localStation: { humidityPct: 30 }, radiationWind: { windSpeed2mKmh: 25 } },
      eto: { inputs: { humidityPct: 30 } },
    });
    expect(fireRiskLevel(cd).level).toBe("ALTO");
    expect(fireRiskLevel(cd).color).toBe("#ea580c");
  });

  it("returns EXTREMO for score >= 7", () => {
    const cd = mockCd({
      calibration: { realTemperatureC: 38 },
      nodes: { localStation: { humidityPct: 15 }, radiationWind: { windSpeed2mKmh: 45 } },
      eto: { inputs: { humidityPct: 15 } },
      exoticVariables: { cloudCoverPct: 10 },
    });
    expect(fireRiskLevel(cd).level).toBe("EXTREMO");
    expect(fireRiskLevel(cd).color).toBe("#dc2626");
  });
});

describe("CARD_COLORS", () => {
  it("has all expected color keys", () => {
    expect(CARD_COLORS).toHaveProperty("bg");
    expect(CARD_COLORS).toHaveProperty("cardBg");
    expect(CARD_COLORS).toHaveProperty("border");
    expect(CARD_COLORS).toHaveProperty("textPrimary");
    expect(CARD_COLORS).toHaveProperty("textSecondary");
    expect(CARD_COLORS).toHaveProperty("blue");
    expect(CARD_COLORS).toHaveProperty("green");
    expect(CARD_COLORS).toHaveProperty("red");
    expect(CARD_COLORS).toHaveProperty("amber");
    expect(CARD_COLORS).toHaveProperty("orange");
    expect(CARD_COLORS).toHaveProperty("purple");
  });

  it("uses valid hex color values", () => {
    const hexColor = /^#[0-9a-fA-F]{6}$/;
    for (const [, value] of Object.entries(CARD_COLORS)) {
      expect(value).toMatch(hexColor);
    }
  });
});
