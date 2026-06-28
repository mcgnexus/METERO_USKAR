import { getClimateCalibrationPayload } from "@/services/climateCalibrationPayloadService";
import { getCurrentWeatherPayload } from "@/services/currentWeatherService";
import { generalAdvice } from "@/lib/weather-advice/generalAdvice";
import { clothingAdvice } from "@/lib/weather-advice/clothingAdvice";
import { walkingAdvice } from "@/lib/weather-advice/walkingAdvice";
import { platformSize, weatherIcon, windDirLabel, formatDateLong, fireRiskLevel } from "@/lib/card-utils";
import type { AdviceContext } from "@/lib/weather-advice/types";
import type { ClimateCalibrationPayload } from "@/types/climate";
import type { WeatherPayload } from "@/types/weather";

export const runtime = "nodejs";

type AdviceCardData = {
  ctx: AdviceContext;
  weatherCode: number;
  windDir: string;
  precipMm: number | null;
  et0: number;
  fireRisk: { level: string; color: string };
  frostRisk: string;
  tips: { text: string }[];
  dateLabel: string;
  unavailable: boolean;
};

function buildAdviceCtx(cd: ClimateCalibrationPayload, w: WeatherPayload): AdviceContext {
  const local = cd.nodes.localStation;
  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
  const humidity = local?.humidityPct ?? cd.eto.inputs.humidityPct ?? w.current.humidityPct ?? 50;
  const windSpeed = cd.nodes.radiationWind.windSpeed2mKmh ?? 0;
  const iso = cd.generatedAt;
  const utcHour = parseInt(iso.slice(11, 13), 10);
  const utcMonth = parseInt(iso.slice(5, 7), 10) - 1;
  const madridOffset = utcMonth >= 2 && utcMonth <= 9 ? 2 : 1;
  const madridHour = (utcHour + madridOffset) % 24;
  return {
    tempC: temp,
    feelsLikeC: w.current.apparentTemperatureC ?? temp,
    humidityPct: humidity,
    windSpeedKmh: windSpeed,
    windGustKmh: w.current.windGustKmh ?? null,
    precipitationProbPct: w.hourly?.precipitationProbabilityPct?.[0] ?? null,
    precipitationMm: w.hourly?.precipitationMm?.[0] ?? null,
    cloudCoverPct: cd.exoticVariables.cloudCoverPct ?? null,
    weatherCode: w.current.weatherCode ?? 0,
    isDaytime: madridHour >= 7 && madridHour < 20,
    month: utcMonth,
    season: utcMonth >= 3 && utcMonth <= 5 ? "spring" : utcMonth >= 6 && utcMonth <= 8 ? "summer" : utcMonth >= 9 && utcMonth <= 11 ? "autumn" : "winter",
  };
}

function generateAgriTips(cd: ClimateCalibrationPayload, w: WeatherPayload): { text: string }[] {
  const tips: { text: string }[] = [];
  const precip = w.hourly?.precipitationProbabilityPct?.[0] ?? 0;
  const wind = w.current.windGustKmh ?? 0;
  const max = w.daily?.temperatureMaxC?.[0];
  const min = w.daily?.temperatureMinC?.[0];
  const frost = cd.dewPoint.frostRisk;

  if (frost === "muy_alta" || frost === "alta" || (min !== undefined && min <= 2))
    tips.push({ text: `Riesgo de helada ${frost === "muy_alta" ? "muy alto" : "alto"}. Cubrir plantas sensibles.` });
  if (max !== undefined && max >= 38)
    tips.push({ text: "Ola de calor. Proteger cultivos, aumentar riego." });
  else if (max !== undefined && max >= 32)
    tips.push({ text: "Riego temprano antes de 8h. Evitar tratamientos foliares." });
  if (precip >= 60)
    tips.push({ text: `Lluvia esperada (${precip}%). Suspender fitosanitarios.` });
  if (wind >= 50)
    tips.push({ text: `Viento muy fuerte (${Math.round(wind)} km/h). No pulverizar.` });
  else if (wind >= 40)
    tips.push({ text: `Viento fuerte (${Math.round(wind)} km/h). Revisar tutores.` });
  if ((cd.eto.etoHourlyMm ?? 0) >= 0.5)
    tips.push({ text: `ET0 alta (${cd.eto.etoHourlyMm?.toFixed(1)} mm). Ajustar riego.` });
  if (tips.length === 0)
    tips.push({ text: "Condiciones normales. Riego de mantenimiento." });
  return tips.slice(0, 4);
}

async function buildData(): Promise<AdviceCardData> {
  const d = new Date();
  const fallback: AdviceCardData = {
    ctx: { tempC: 0, feelsLikeC: 0, humidityPct: null, windSpeedKmh: 0, windGustKmh: null, precipitationProbPct: null, precipitationMm: null, cloudCoverPct: null, weatherCode: 0, isDaytime: true, month: d.getMonth(), season: "summer" },
    weatherCode: 0, windDir: "--", precipMm: null, et0: 0,
    fireRisk: { level: "--", color: "#64748b" }, frostRisk: "none",
    tips: [{ text: "Datos temporalmente no disponibles" }],
    dateLabel: formatDateLong(), unavailable: true,
  };
  try {
    const [cr, wr] = await Promise.allSettled([getClimateCalibrationPayload(), getCurrentWeatherPayload()]);
    const cd = cr.status === "fulfilled" ? cr.value : null;
    const w = wr.status === "fulfilled" ? wr.value : null;
    if (!cd || !w) return fallback;

    const ctx = buildAdviceCtx(cd, w);
    const general = generalAdvice(ctx);
    const clothing = clothingAdvice(ctx);
    const walking = walkingAdvice(ctx);

    const tips: { text: string }[] = [];
    tips.push({ text: `${general.title}: ${general.label}` });
    if (clothing.label) tips.push({ text: clothing.label });
    if (walking.label) tips.push({ text: walking.label });
    tips.push(...generateAgriTips(cd, w));

    return {
      ctx,
      weatherCode: w.current.weatherCode ?? 0,
      windDir: windDirLabel(cd.extrapolation.bazaWindDirectionDeg),
      precipMm: w.hourly?.precipitationMm?.[0] ?? null,
      et0: cd.eto.etoHourlyMm ?? 0,
      fireRisk: fireRiskLevel(cd),
      frostRisk: cd.dewPoint.frostRisk,
      tips: tips.slice(0, 5),
      dateLabel: formatDateLong(),
      unavailable: false,
    };
  } catch { return fallback; }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSvg(d: AdviceCardData, W: number, H: number): string {
  const isStory = H > W;
  const PAD = isStory ? 48 : 40;
  const CW = W - PAD * 2;
  const F = "Segoe UI, sans-serif";
  const FS = isStory ? 1.3 : 1;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#0f172a"/>`);

  if (isStory) parts.push(`<rect y="${H * 0.15}" width="${W}" height="${H * 0.7}" fill="none"/>`);

  let y = PAD + 28 * FS;

  // Header
  parts.push(`<text x="${PAD}" y="${y}" font-family="${F}" font-size="${32 * FS}" font-weight="800" fill="#f8fafc">Meteo Huescar</text>`);
  y += 28 * FS;
  parts.push(`<text x="${PAD}" y="${y}" font-family="${F}" font-size="${20 * FS}" fill="#94a3b8">${esc(d.dateLabel)}</text>`);
  y += 30 * FS;

  if (d.unavailable) {
    parts.push(`<text x="${W / 2}" y="${H / 2}" font-family="${F}" font-size="32" fill="#94a3b8" text-anchor="middle">Datos temporalmente no disponibles</text>`);
  } else {
    // Conditions strip - 4 boxes
    const condW = (CW - 36) / 4;
    const condY = y;
    const condH = 68 * FS;
    const conditions = [
      { label: "Temp", value: `${Math.round(d.ctx.tempC)}`, color: "#ef4444" },
      { label: "Sensacion", value: `${Math.round(d.ctx.feelsLikeC)}`, color: "#3b82f6" },
      { label: "Viento", value: `${Math.round(d.ctx.windSpeedKmh)} ${d.windDir}`, color: "#f59e0b" },
      { label: "Lluvia", value: d.precipMm != null ? `${d.precipMm.toFixed(1)} mm` : "--", color: "#3b82f6" },
    ];
    for (let i = 0; i < 4; i++) {
      const cx = PAD + i * (condW + 12);
      parts.push(`<rect x="${cx}" y="${condY}" width="${condW}" height="${condH}" rx="14" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
      parts.push(`<text x="${cx + 12}" y="${condY + 22 * FS}" font-family="${F}" font-size="${14 * FS}" fill="#94a3b8">${conditions[i].label}</text>`);
      parts.push(`<text x="${cx + 12}" y="${condY + 48 * FS}" font-family="${F}" font-size="${22 * FS}" font-weight="800" fill="${conditions[i].color}">${esc(conditions[i].value)}</text>`);
    }
    y += condH + 22 * FS;

    // Tips section
    const tipCount = d.tips.length;
    const tipH = 48 * FS + tipCount * 32 * FS;
    parts.push(`<rect x="${PAD}" y="${y}" width="${CW}" height="${tipH}" rx="20" fill="#1e293b" stroke="#334155" stroke-width="2"/>`);
    parts.push(`<text x="${PAD + 24}" y="${y + 32 * FS}" font-family="${F}" font-size="${22 * FS}" font-weight="700" fill="#22c55e" letter-spacing="2">CONSEJOS DEL DIA</text>`);
    for (let i = 0; i < tipCount; i++) {
      const ty = y + 60 * FS + i * 32 * FS;
      parts.push(`<circle cx="${PAD + 36}" cy="${ty - 6 * FS}" r="5" fill="#22c55e"/>`);
      parts.push(`<text x="${PAD + 52}" y="${ty}" font-family="${F}" font-size="${20 * FS}" fill="#f8fafc">${esc(d.tips[i].text)}</text>`);
    }
    y += tipH + 18 * FS;

    // Fire risk + frost + ET0
    const colW = (CW - 24) / (1 + (d.frostRisk !== "none" && d.frostRisk !== "unknown" ? 1 : 0) + (d.et0 > 0 ? 1 : 0));
    const ry = y;
    parts.push(`<rect x="${PAD}" y="${ry}" width="${colW}" height="72" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
    parts.push(`<text x="${PAD + 18}" y="${ry + 26}" font-family="${F}" font-size="${14 * FS}" fill="#94a3b8">Riesgo incendio</text>`);
    parts.push(`<text x="${PAD + 18}" y="${ry + 56}" font-family="${F}" font-size="${24 * FS}" font-weight="800" fill="${d.fireRisk.color}">${d.fireRisk.level}</text>`);

    let col = 1;
    if (d.frostRisk !== "none" && d.frostRisk !== "unknown") {
      const fx = PAD + col * (colW + 12);
      parts.push(`<rect x="${fx}" y="${ry}" width="${colW}" height="72" rx="16" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>`);
      parts.push(`<text x="${fx + 18}" y="${ry + 26}" font-family="${F}" font-size="${14 * FS}" fill="#93c5fd">Helada</text>`);
      const fl = d.frostRisk === "muy_alta" ? "Muy alto" : d.frostRisk === "alta" ? "Alto" : "Medio";
      parts.push(`<text x="${fx + 18}" y="${ry + 56}" font-family="${F}" font-size="${24 * FS}" font-weight="700" fill="#93c5fd">${fl}</text>`);
      col++;
    }
    if (d.et0 > 0) {
      const ex = PAD + col * (colW + 12);
      parts.push(`<rect x="${ex}" y="${ry}" width="${colW}" height="72" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
      parts.push(`<text x="${ex + 18}" y="${ry + 26}" font-family="${F}" font-size="${14 * FS}" fill="#94a3b8">ET0</text>`);
      parts.push(`<text x="${ex + 18}" y="${ry + 56}" font-family="${F}" font-size="${24 * FS}" font-weight="800" fill="#22c55e">${d.et0.toFixed(1)} mm</text>`);
    }
  }

  // Footer
  const footerY = isStory ? H - 80 : H - 50;
  parts.push(`<text x="${W / 2}" y="${footerY}" font-family="${F}" font-size="${16 * FS}" font-weight="700" fill="#94a3b8" text-anchor="middle">meteo.tecrural.es</text>`);

  parts.push(`</svg>`);
  return parts.join("");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") ?? "ig") as "ig" | "og" | "story";
  const { width, height } = platformSize(platform);
  const data = await buildData();
  const svg = buildSvg(data, width, height);
  const sharp = await import("sharp");
  const buf = await sharp.default(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
}
