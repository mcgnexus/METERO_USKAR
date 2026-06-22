import { cacheGet, cacheSet } from "@/lib/inMemoryCache";

const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface FrostData {
  lastFrostDate: string | null;
  daysSinceLastFrost: number | null;
  nextFrostDate: string | null;
  daysUntilNextFrost: number | null;
  frostFreeDays: number;
  totalFrostNightsThisSeason: number;
}

export interface ChillData {
  chillHoursAccumulated: number;
  chillPortionsAccumulated: number;
  seasonStart: string;
  chillTarget: number;
  chillProgressPct: number;
}

export interface WaterBalanceData {
  precipitationMmThisMonth: number;
  precipitationMmThisYear: number;
  precipitationMmThisSeason: number;
  et0MmThisMonth: number;
  et0MmThisSeason: number;
  deficitMmThisMonth: number;
  deficitMmThisSeason: number;
  monthLabel: string;
  seasonStart: string;
}

export interface AgroClimatologyPayload {
  location: { lat: number; lon: number; elevation: number };
  generatedAt: string;
  frost: FrostData;
  chill: ChillData;
  waterBalance: WaterBalanceData;
}

function parseNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function seasonStartChill(): string {
  const now = new Date();
  const year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-11-01`;
}

function seasonStartWater(): string {
  const now = new Date();
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-09-01`;
}

function monthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

function endDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function dynamicChillModel(hourlyTemps: number[]): { hours: number; portions: number } {
  const CHILL_BREAKS = [
    { range: [-1000, 0], weight: 0 },
    { range: [0, 1.4], weight: 0.5 },
    { range: [1.4, 2.4], weight: 1.0 },
    { range: [2.4, 9.1], weight: 0.5 },
    { range: [9.1, 12.4], weight: 0 },
    { range: [12.4, 15.3], weight: -0.5 },
    { range: [15.3, 18], weight: -1.0 },
    { range: [18, 21], weight: -1.5 },
    { range: [21, 1000], weight: -2.0 },
  ];

  let chillPortions = 0;
  let chillHours = 0;

  for (const t of hourlyTemps) {
    const br = CHILL_BREAKS.find((b) => t >= b.range[0] && t < b.range[1]);
    if (br) chillPortions += Math.max(0, br.weight);
    if (t >= 0 && t <= 7.2) chillHours++;
  }

  chillPortions = chillPortions / 24;

  return { hours: chillHours, portions: Math.round(chillPortions * 100) / 100 };
}

export async function fetchAgroClimatology(
  lat: number,
  lon: number,
  elevation: number
): Promise<AgroClimatologyPayload | null> {
  const cacheKey = `agroclim:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  const cached = cacheGet<AgroClimatologyPayload>(cacheKey);
  if (cached) return cached;

  const chillStart = seasonStartChill();
  const waterStart = seasonStartWater();
  const mStart = monthStart();
  const yStart = yearStart();
  const end = endDate();

  const fetchWindow = (start: string, stop: string) => {
    const vars = [
      "temperature_2m",
      "precipitation",
      "et0_fao_evapotranspiration",
    ].join(",");
    return `${ARCHIVE_BASE}?latitude=${lat}&longitude=${lon}&elevation=${elevation}` +
      `&start_date=${start}&end_date=${stop}` +
      `&hourly=${vars}&timezone=Europe/Madrid`;
  };

  try {
    const chillUrl = fetchWindow(chillStart, end);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(chillUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;

    const json = await res.json();
    const hourly = json.hourly;
    if (!hourly?.time || !Array.isArray(hourly.time)) return null;

    const temps: number[] = (hourly.temperature_2m ?? []).map(parseNum).filter((v: number | null): v is number => v !== null);
    const precip: (number | null)[] = (hourly.precipitation ?? []).map(parseNum);
    const et0: (number | null)[] = (hourly.et0_fao_evapotranspiration ?? []).map(parseNum);
    const times: string[] = hourly.time;

    const now = new Date();
    let lastFrostIdx = -1;
    let totalFrostNights = 0;
    let lastDayHadFrost = false;

    for (let i = 0; i < times.length; i++) {
      const t = temps[i];
      if (t !== undefined && t <= 0) {
        const d = new Date(times[i]);
        const dayKey = d.toDateString();
        if (!lastDayHadFrost || dayKey !== new Date(times[i - 1] ?? times[i]).toDateString()) {
          if (t <= 0) totalFrostNights++;
        }
        lastFrostIdx = i;
        lastDayHadFrost = true;
      } else {
        lastDayHadFrost = false;
      }
    }

    const lastFrostDate = lastFrostIdx >= 0 ? times[lastFrostIdx] : null;
    const daysSinceLastFrost = lastFrostDate
      ? Math.floor((now.getTime() - new Date(lastFrostDate).getTime()) / 86400000)
      : null;

    const frostFreeDays = lastFrostIdx >= 0 ? daysSinceLastFrost ?? 0 : Math.floor((now.getTime() - new Date(chillStart).getTime()) / 86400000);

    const chill = dynamicChillModel(temps);
    const chillTarget = 700;
    const chillProgressPct = Math.min(100, Math.round((chill.hours / chillTarget) * 100));

    const precipThisSeason = precip.reduce<number>((s, v) => s + (v ?? 0), 0);
    const et0ThisSeason = et0.reduce<number>((s, v) => s + (v ?? 0), 0);

    const monthIdxStart = times.findIndex((t) => t.slice(0, 10) >= mStart);
    const monthIdxEnd = times.length;
    const precipThisMonth = monthIdxStart >= 0
      ? precip.slice(monthIdxStart, monthIdxEnd).reduce<number>((s, v) => s + (v ?? 0), 0)
      : 0;
    const et0ThisMonth = monthIdxStart >= 0
      ? et0.slice(monthIdxStart, monthIdxEnd).reduce<number>((s, v) => s + (v ?? 0), 0)
      : 0;

    const yearIdxStart = times.findIndex((t) => t.slice(0, 10) >= yStart);
    const precipThisYear = yearIdxStart >= 0
      ? precip.slice(yearIdxStart).reduce<number>((s, v) => s + (v ?? 0), 0)
      : precipThisSeason;

    const result: AgroClimatologyPayload = {
      location: { lat, lon, elevation },
      generatedAt: now.toISOString(),
      frost: {
        lastFrostDate,
        daysSinceLastFrost,
        nextFrostDate: null,
        daysUntilNextFrost: null,
        frostFreeDays,
        totalFrostNightsThisSeason: totalFrostNights,
      },
      chill: {
        chillHoursAccumulated: chill.hours,
        chillPortionsAccumulated: chill.portions,
        seasonStart: chillStart,
        chillTarget,
        chillProgressPct,
      },
      waterBalance: {
        precipitationMmThisMonth: Math.round(precipThisMonth * 10) / 10,
        precipitationMmThisYear: Math.round(precipThisYear * 10) / 10,
        precipitationMmThisSeason: Math.round(precipThisSeason * 10) / 10,
        et0MmThisMonth: Math.round(et0ThisMonth * 10) / 10,
        et0MmThisSeason: Math.round(et0ThisSeason * 10) / 10,
        deficitMmThisMonth: Math.round((et0ThisMonth - precipThisMonth) * 10) / 10,
        deficitMmThisSeason: Math.round((et0ThisSeason - precipThisSeason) * 10) / 10,
        monthLabel: now.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
        seasonStart: waterStart,
      },
    };

    cacheSet(cacheKey, result, CACHE_TTL_MS);
    return result;
  } catch {
    return null;
  }
}
