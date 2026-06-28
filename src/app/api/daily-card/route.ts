import { getClimateCalibrationPayload } from "@/services/climateCalibrationPayloadService";
import { getCurrentWeatherPayload } from "@/services/currentWeatherService";
import { fireRiskLevel, formatDateLong, windDirLabel, weatherDesc, weatherIcon } from "@/lib/card-utils";
import type { WeatherPayload } from "@/types/weather";
import type { ClimateCalibrationPayload } from "@/types/climate";

export const runtime = "nodejs";

type CardData = {
  tempMax: number;
  tempMin: number;
  feelsLike: number;
  weatherCode: number;
  humidity: number;
  windSpeed: number;
  windDir: string;
  precipProb: number;
  et0: number;
  frostRisk: string;
  aemetAlerts: string[];
  advice: { emoji: string; text: string }[];
  fireRisk: { level: string; color: string };
  dateLabel: string;
};

function generateAdvice(w: Pick<WeatherPayload, "current" | "hourly" | "alerts" | "daily">, cd: ClimateCalibrationPayload): { emoji: string; text: string }[] {
  const tips: { emoji: string; text: string }[] = [];
  const max = w.daily?.temperatureMaxC?.[0];
  const min = w.daily?.temperatureMinC?.[0];
  const precip = w.hourly?.precipitationProbabilityPct?.[0] ?? 0;
  const wind = w.current?.windGustKmh ?? 0;
  const humidity = w.current?.humidityPct ?? 50;
  const frost = cd.dewPoint.frostRisk;

  if (frost === "muy_alta") tips.push({ emoji: "*", text: "Riesgo de helada muy alto. Cubrir plantas sensibles." });
  else if (frost === "alta") tips.push({ emoji: "*", text: "Riesgo de helada alto. Proteger cultivos sensibles al frio." });

  if (max !== undefined && max >= 38) tips.push({ emoji: "!", text: "Ola de calor. Proteger cultivos, aumentar riego." });
  else if (max !== undefined && max >= 32) tips.push({ emoji: "~", text: "Riego temprano antes de 8h. Evitar tratamientos al mediodia." });

  if (precip >= 60) tips.push({ emoji: "R", text: "Lluvia esperada. Suspender fitosanitarios, revisar drenajes." });
  if (wind >= 50) tips.push({ emoji: "W", text: "Viento muy fuerte. No aplicar pulverizaciones." });
  else if (wind >= 40) tips.push({ emoji: "W", text: "Viento fuerte. Revisar estructuras y tutores." });
  if (humidity <= 30) tips.push({ emoji: "D", text: "Baja humedad. Aumentar riego, vigilar estres hidrico." });

  const hasAemetAlert = w.alerts.some((a) => a.level === "severo" || a.level === "peligro");
  if (hasAemetAlert) {
    const alert = w.alerts.find((a) => a.level === "severo" || a.level === "peligro");
    if (alert) tips.push({ emoji: "A", text: `AEMET: ${alert.title}` });
  }

  if (tips.length === 0) tips.push({ emoji: "OK", text: "Condiciones normales. Riego de mantenimiento." });
  return tips.slice(0, 3);
}

async function buildCardData(): Promise<CardData> {
  const fallback: CardData = {
    tempMax: 0, tempMin: 0, feelsLike: 0, weatherCode: 0,
    humidity: 0, windSpeed: 0, windDir: "--", precipProb: 0, et0: 0,
    frostRisk: "none", aemetAlerts: [], advice: [{ emoji: "!", text: "Datos temporalmente no disponibles" }],
    fireRisk: { level: "--", color: "#64748b" }, dateLabel: formatDateLong(),
  };
  try {
    const [cr, wr] = await Promise.allSettled([getClimateCalibrationPayload(), getCurrentWeatherPayload()]);
    const cd = cr.status === "fulfilled" ? cr.value : null;
    const w = wr.status === "fulfilled" ? wr.value : null;
    if (!cd || !w) return fallback;
    const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
    const max = w.daily?.temperatureMaxC?.[0];
    const min = w.daily?.temperatureMinC?.[0];
    const alerts = w.alerts.filter((a) => a.level === "severo" || a.level === "peligro").map((a) => a.title);
    return {
      tempMax: max ?? temp, tempMin: min ?? temp,
      feelsLike: w.current.apparentTemperatureC ?? temp,
      weatherCode: w.current.weatherCode ?? 0,
      humidity: w.current.humidityPct ?? cd.nodes.localStation?.humidityPct ?? 0,
      windSpeed: w.current.windGustKmh ?? 0,
      windDir: windDirLabel(w.current.windDirectionDeg ?? cd.extrapolation.bazaWindDirectionDeg),
      precipProb: w.hourly?.precipitationProbabilityPct?.[0] ?? 0,
      et0: cd.eto.etoHourlyMm ?? 0,
      frostRisk: cd.dewPoint.frostRisk,
      aemetAlerts: alerts,
      advice: generateAdvice(w, cd),
      fireRisk: fireRiskLevel(cd),
      dateLabel: formatDateLong(),
    };
  } catch { return fallback; }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSvg(d: CardData): string {
  const W = 1080, H = 1080, PAD = 48;
  const CW = W - PAD * 2;
  const F = "Segoe UI, sans-serif";
  const E = "Segoe UI Emoji, Segoe UI, sans-serif";

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`);

  // Background
  parts.push(`<rect width="${W}" height="${H}" fill="#0f172a"/>`);

  let y = PAD + 42;

  // Header
  parts.push(`<text x="${PAD}" y="${y}" font-family="${E}" font-size="38" font-weight="800" fill="#f8fafc">${esc(weatherIcon(d.weatherCode))} Meteo Huescar</text>`);
  y += 36;
  parts.push(`<text x="${PAD}" y="${y}" font-family="${F}" font-size="26" fill="#94a3b8">${esc(d.dateLabel)}</text>`);
  y += 40;

  // Temperature block
  const tH = 130;
  parts.push(`<rect x="${PAD}" y="${y}" width="${CW}" height="${tH}" rx="20" fill="#1e293b" stroke="#334155" stroke-width="2"/>`);
  const tY = y + 38;
  parts.push(`<text x="${PAD + 28}" y="${tY}" font-family="${F}" font-size="22" font-weight="700" fill="#3b82f6" letter-spacing="2">TEMPERATURAS</text>`);
  const mY = tY + 52;
  parts.push(`<text x="${PAD + 28}" y="${mY}" font-family="${F}" font-size="22" fill="#94a3b8">Max</text>`);
  parts.push(`<text x="${PAD + 28}" y="${mY + 38}" font-family="${F}" font-size="52" font-weight="800" fill="#ef4444">${Math.round(d.tempMax)}</text>`);
  parts.push(`<text x="${PAD + 200}" y="${mY}" font-family="${F}" font-size="22" fill="#94a3b8">Min</text>`);
  parts.push(`<text x="${PAD + 200}" y="${mY + 38}" font-family="${F}" font-size="52" font-weight="800" fill="#3b82f6">${Math.round(d.tempMin)}</text>`);
  parts.push(`<text x="${PAD + 370}" y="${mY}" font-family="${F}" font-size="22" fill="#94a3b8">Sensacion</text>`);
  parts.push(`<text x="${PAD + 370}" y="${mY + 38}" font-family="${F}" font-size="44" font-weight="700" fill="#f8fafc">${Math.round(d.feelsLike)}</text>`);
  parts.push(`<text x="${PAD + CW - 28}" y="${mY + 20}" font-family="${F}" font-size="28" fill="#f8fafc" text-anchor="end">${esc(weatherDesc(d.weatherCode))}</text>`);
  y += tH + 20;

  // Metrics row (4 cards)
  const mW = (CW - 48) / 4;
  const metrics = [
    { label: "ET0", value: d.et0 > 0 ? `${d.et0.toFixed(1)} mm` : "--", color: "#22c55e" },
    { label: "Humedad", value: `${Math.round(d.humidity)}%`, color: "#38bdf8" },
    { label: "Viento", value: `${Math.round(d.windSpeed)} ${d.windDir}`, color: "#a78bfa" },
    { label: "Lluvia", value: `${Math.round(d.precipProb)}%`, color: "#38bdf8" },
  ];
  for (let i = 0; i < metrics.length; i++) {
    const mx = PAD + i * (mW + 16);
    parts.push(`<rect x="${mx}" y="${y}" width="${mW}" height="80" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
    parts.push(`<text x="${mx + 14}" y="${y + 30}" font-family="${F}" font-size="18" fill="#94a3b8">${metrics[i].label}</text>`);
    parts.push(`<text x="${mx + 14}" y="${y + 62}" font-family="${F}" font-size="28" font-weight="800" fill="${metrics[i].color}">${metrics[i].value}</text>`);
  }
  y += 100;

  // Advice block
  const advLines = d.advice.length;
  const advH = 50 + advLines * 38;
  parts.push(`<rect x="${PAD}" y="${y}" width="${CW}" height="${advH}" rx="20" fill="#1e293b" stroke="#334155" stroke-width="2"/>`);
  parts.push(`<text x="${PAD + 24}" y="${y + 34}" font-family="${F}" font-size="22" font-weight="700" fill="#22c55e" letter-spacing="2">CONSEJOS DEL DIA</text>`);
  for (let i = 0; i < d.advice.length; i++) {
    const ay = y + 70 + i * 38;
    parts.push(`<circle cx="${PAD + 36}" cy="${ay - 6}" r="8" fill="#22c55e"/>`);
    parts.push(`<text x="${PAD + 56}" y="${ay}" font-family="${F}" font-size="22" fill="#f8fafc">${esc(d.advice[i].text)}</text>`);
  }
  y += advH + 20;

  // Fire risk + frost
  const riskW = d.aemetAlerts.length > 0 ? (CW - 32) / 2 : CW;
  parts.push(`<rect x="${PAD}" y="${y}" width="${riskW}" height="80" rx="16" fill="#1e293b" stroke="#334155" stroke-width="1"/>`);
  parts.push(`<text x="${PAD + 20}" y="${y + 30}" font-family="${F}" font-size="18" fill="#94a3b8">Riesgo incendio</text>`);
  parts.push(`<text x="${PAD + 20}" y="${y + 62}" font-family="${F}" font-size="32" font-weight="800" fill="${d.fireRisk.color}">${d.fireRisk.level}</text>`);

  if (d.aemetAlerts.length > 0) {
    const ax = PAD + riskW + 16;
    parts.push(`<rect x="${ax}" y="${y}" width="${riskW}" height="80" rx="16" fill="#1e293b" stroke="#dc2626" stroke-width="2"/>`);
    parts.push(`<text x="${ax + 20}" y="${y + 30}" font-family="${F}" font-size="18" fill="#fca5a5">Alerta AEMET</text>`);
    parts.push(`<text x="${ax + 20}" y="${y + 58}" font-family="${F}" font-size="22" font-weight="700" fill="#fca5a5">${esc(d.aemetAlerts[0].slice(0, 30))}</text>`);
  }
  y += 100;

  // Footer
  parts.push(`<line x1="${PAD}" y1="${H - 70}" x2="${W - PAD}" y2="${H - 70}" stroke="#334155" stroke-width="1"/>`);
  parts.push(`<text x="${PAD}" y="${H - 38}" font-family="${F}" font-size="22" font-weight="700" fill="#94a3b8">meteo.tecrural.es</text>`);
  parts.push(`<text x="${W - PAD}" y="${H - 38}" font-family="${F}" font-size="18" fill="#475569" text-anchor="end">Datos hiperlocales para Huescar</text>`);

  parts.push(`</svg>`);
  return parts.join("");
}

export async function GET() {
  const data = await buildCardData();
  const svg = buildSvg(data);
  const sharp = await import("sharp");
  const buf = await sharp.default(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(buf), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
}
