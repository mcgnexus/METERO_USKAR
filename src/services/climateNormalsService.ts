import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const CLIMATE_API = "https://climate-api.open-meteo.com/v1/climate-average";
const ARCHIVE_API = "https://archive-api.open-meteo.com/v1/archive";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface MonthlyNormal {
  month: number;
  tempMaxC: number;
  tempMinC: number;
  tempMeanC: number;
  precipitationMm: number;
}

export interface ClimateNormalsPayload {
  location: { lat: number; lon: number };
  normals: MonthlyNormal[];
  currentMonthDeviation: {
    month: number;
    observedTempMeanC: number | null;
    normalTempMeanC: number;
    deviationC: number | null;
    observedPrecipMm: number | null;
    normalPrecipMm: number;
    precipDeviationPct: number | null;
    interpretation: string;
  };
  generatedAt: string;
}

function parseNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

export async function fetchClimateNormals(
  lat: number,
  lon: number
): Promise<ClimateNormalsPayload | null> {
  const cacheKey = `climate-normals:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const cached = cacheGet<ClimateNormalsPayload>(cacheKey);
  if (cached) return cached;

  const dailyVars = [
    "temperature_2m_mean_max",
    "temperature_2m_mean_min",
    "temperature_2m_mean",
    "precipitation_sum",
  ].join(",");

  try {
    const normalsRes = await fetch(
      `${CLIMATE_API}?latitude=${lat}&longitude=${lon}&daily=${dailyVars}`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!normalsRes.ok) return null;
    const normalsJson = await normalsRes.json();
    const nd = normalsJson.daily;
    if (!nd) return null;

    const months: number[] = Array.from({ length: 12 }, (_, i) => i + 1);
    const normals: MonthlyNormal[] = months.map((m) => ({
      month: m,
      tempMaxC: parseNum(nd.temperature_2m_mean_max?.[m - 1]) ?? 0,
      tempMinC: parseNum(nd.temperature_2m_mean_min?.[m - 1]) ?? 0,
      tempMeanC: parseNum(nd.temperature_2m_mean?.[m - 1]) ?? 0,
      precipitationMm: parseNum(nd.precipitation_sum?.[m - 1]) ?? 0,
    }));

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const yearStr = now.getFullYear();
    const monthStr = String(currentMonth).padStart(2, "0");
    const monthStart = `${yearStr}-${monthStr}-01`;
    const todayStr = now.toISOString().slice(0, 10);

    let observedTemp: number | null = null;
    let observedPrecip: number | null = null;

    try {
      const archiveRes = await fetch(
        `${ARCHIVE_API}?latitude=${lat}&longitude=${lon}` +
          `&start_date=${monthStart}&end_date=${todayStr}` +
          `&daily=temperature_2m_mean,precipitation_sum&timezone=Europe/Madrid`,
        { signal: AbortSignal.timeout(12000) }
      );
      if (archiveRes.ok) {
        const aj = await archiveRes.json();
        const ad = aj.daily;
        if (ad?.time?.length) {
          const rawTemps: unknown[] = (ad.temperature_2m_mean ?? []) as unknown[];
          const rawPrecips: unknown[] = (ad.precipitation_sum ?? []) as unknown[];
          const temps: number[] = rawTemps.map(parseNum).filter((v: number | null): v is number => v !== null);
          const precips: number[] = rawPrecips.map(parseNum).filter((v: number | null): v is number => v !== null);
          if (temps.length) observedTemp = temps.reduce<number>((a, b) => a + b, 0) / temps.length;
          if (precips.length) observedPrecip = precips.reduce<number>((a, b) => a + b, 0);
        }
      }
    } catch {
      // archive may not have current month yet; continue with normals only
    }

    const normalThisMonth = normals[currentMonth - 1];
    const deviationC = observedTemp !== null ? observedTemp - normalThisMonth.tempMeanC : null;
    const precipDeviationPct = observedPrecip !== null && normalThisMonth.precipitationMm > 0
      ? ((observedPrecip - normalThisMonth.precipitationMm) / normalThisMonth.precipitationMm) * 100
      : null;

    let interpretation: string;
    if (deviationC === null) {
      interpretation = "Sin datos observados suficientes para comparar.";
    } else if (Math.abs(deviationC) < 0.5) {
      interpretation = "Temperatura dentro de lo normal para este mes.";
    } else if (deviationC > 0) {
      interpretation = `Mes ${deviationC.toFixed(1)}°C más cálido de lo normal.`;
    } else {
      interpretation = `Mes ${Math.abs(deviationC).toFixed(1)}°C más frío de lo normal.`;
    }
    if (precipDeviationPct !== null) {
      if (precipDeviationPct < -20) interpretation += " Lluvia por debajo de lo habitual.";
      else if (precipDeviationPct > 20) interpretation += " Lluvia por encima de lo habitual.";
    }

    const result: ClimateNormalsPayload = {
      location: { lat, lon },
      normals,
      currentMonthDeviation: {
        month: currentMonth,
        observedTempMeanC: observedTemp !== null ? Math.round(observedTemp * 10) / 10 : null,
        normalTempMeanC: Math.round(normalThisMonth.tempMeanC * 10) / 10,
        deviationC: deviationC !== null ? Math.round(deviationC * 10) / 10 : null,
        observedPrecipMm: observedPrecip !== null ? Math.round(observedPrecip * 10) / 10 : null,
        normalPrecipMm: Math.round(normalThisMonth.precipitationMm * 10) / 10,
        precipDeviationPct: precipDeviationPct !== null ? Math.round(precipDeviationPct) : null,
        interpretation,
      },
      generatedAt: now.toISOString(),
    };

    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch {
    return null;
  }
}
