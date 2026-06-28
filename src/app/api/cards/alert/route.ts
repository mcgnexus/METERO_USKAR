import { getClimateCalibrationPayload } from "@/services/climateCalibrationPayloadService";
import { getCurrentWeatherPayload } from "@/services/currentWeatherService";
import { buildAlarms, levelLabel, type PulseAlarm } from "@/components/llano/alarms-logic";
import { platformSize, weatherIcon, formatDateLong } from "@/lib/card-utils";
import type { WeatherPayload } from "@/types/weather";
import type { ClimateCalibrationPayload } from "@/types/climate";

export const runtime = "nodejs";

type AlertCardData = {
  alarms: PulseAlarm[];
  weatherCode: number;
  temp: number;
  wind: number;
  humidity: number;
  dateLabel: string;
  unavailable: boolean;
};

function alarmColor(level: PulseAlarm["level"]): string {
  switch (level) {
    case "critico": return "#dc2626";
    case "precaucion": return "#ea580c";
    case "aviso": return "#eab308";
    case "info": return "#3b82f6";
  }
}

function alarmBg(level: PulseAlarm["level"]): string {
  switch (level) {
    case "critico": return "#2d1111";
    case "precaucion": return "#2d1a0e";
    case "aviso": return "#2d2a0e";
    case "info": return "#0f1a2d";
  }
}

function alarmMarker(level: PulseAlarm["level"]): string {
  switch (level) {
    case "critico": return "[!]";
    case "precaucion": return "[!]";
    case "aviso": return "[*]";
    case "info": return "[i]";
  }
}

async function buildData(): Promise<AlertCardData> {
  const fallback: AlertCardData = {
    alarms: [], weatherCode: 0, temp: 0, wind: 0, humidity: 0,
    dateLabel: formatDateLong(), unavailable: true,
  };
  try {
    const [cr, wr] = await Promise.allSettled([getClimateCalibrationPayload(), getCurrentWeatherPayload()]);
    const cd = cr.status === "fulfilled" ? cr.value : null;
    const w = wr.status === "fulfilled" ? wr.value : null;
    if (!cd || !w) return fallback;

    const alarms = buildAlarms(cd, { daily: w.daily, weather: w, agricultural: w.agricultural });
    const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;

    return {
      alarms: alarms.filter((a) => a.level === "critico" || a.level === "precaucion"),
      weatherCode: w.current.weatherCode ?? 0,
      temp,
      wind: w.current.windGustKmh ?? 0,
      humidity: w.current.humidityPct ?? 50,
      dateLabel: formatDateLong(),
      unavailable: false,
    };
  } catch { return fallback; }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSvg(d: AlertCardData, W: number, H: number): string {
  const isStory = H > W;
  const PAD = 48;
  const CW = W - PAD * 2;
  const F = "Segoe UI, sans-serif";
  const FS = isStory ? 1.3 : 1;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">`);
  parts.push(`<rect width="${W}" height="${H}" fill="#0f172a"/>`);

  let y = PAD + 28 * FS;

  // Header
  parts.push(`<text x="${PAD}" y="${y}" font-family="${F}" font-size="${34 * FS}" font-weight="800" fill="#f8fafc">Meteo Huescar</text>`);
  y += 28 * FS;
  parts.push(`<text x="${PAD}" y="${y}" font-family="${F}" font-size="${22 * FS}" fill="#94a3b8">${esc(d.dateLabel)}</text>`);
  y += 30 * FS;

  if (d.unavailable || d.alarms.length === 0) {
    const msg = d.unavailable ? "Datos no disponibles" : "Sin alertas activas";
    parts.push(`<text x="${W / 2}" y="${H / 2 - 20}" font-family="${F}" font-size="36" fill="#94a3b8" text-anchor="middle">${msg}</text>`);
    parts.push(`<text x="${W / 2}" y="${H / 2 + 30}" font-family="${F}" font-size="24" fill="#94a3b8" text-anchor="middle">Condiciones normales</text>`);
  } else {
    // Alarm blocks
    const maxAlarms = 4;
    for (let i = 0; i < Math.min(d.alarms.length, maxAlarms); i++) {
      const a = d.alarms[i];
      const color = alarmColor(a.level);
      const bg = alarmBg(a.level);
      const marker = alarmMarker(a.level);

      const titleLines = Math.ceil(a.title.length / 40);
      const msgLines = Math.ceil(a.message.length / 50);
      const blockH = 48 * FS + 30 * FS + titleLines * 26 * FS + msgLines * 22 * FS;

      parts.push(`<rect x="${PAD}" y="${y}" width="${CW}" height="${blockH}" rx="20" fill="${bg}" stroke="${color}40" stroke-width="2"/>`);
      parts.push(`<text x="${PAD + 24}" y="${y + 32 * FS}" font-family="${F}" font-size="${20 * FS}" font-weight="700" fill="${color}" letter-spacing="1">${marker} ${esc(levelLabel(a.level))}</text>`);
      parts.push(`<text x="${PAD + 24}" y="${y + 62 * FS}" font-family="${F}" font-size="${28 * FS}" font-weight="800" fill="#f8fafc">${esc(a.title.slice(0, 50))}</text>`);
      parts.push(`<text x="${PAD + 24}" y="${y + 92 * FS + 20}" font-family="${F}" font-size="${18 * FS}" fill="#cbd5e1">${esc(a.message.slice(0, 120))}</text>`);

      y += blockH + (isStory ? 28 : 16);
    }
  }

  // Footer conditions
  const fY = isStory ? H - 100 : H - 70;
  parts.push(`<line x1="${PAD}" y1="${fY}" x2="${W - PAD}" y2="${fY}" stroke="#334155" stroke-width="1"/>`);
  const condY = fY + 28;
  const colW = (CW - 24) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = PAD + i * (colW + 12);
    parts.push(`<line x1="${cx + colW}" y1="${fY}" x2="${cx + colW}" y2="${fY + 50}" stroke="#334155" stroke-width="1"/>`);
  }
  const conds = [
    { label: "Temp", value: `${Math.round(d.temp)}`, color: "#3b82f6" },
    { label: "Viento", value: `${Math.round(d.wind)} km/h`, color: "#f59e0b" },
    { label: "Humedad", value: `${Math.round(d.humidity)}%`, color: "#22c55e" },
  ];
  for (let i = 0; i < 3; i++) {
    const cx = PAD + i * (colW + 12);
    parts.push(`<text x="${cx + colW / 2}" y="${condY}" font-family="${F}" font-size="${16 * FS}" fill="#94a3b8" text-anchor="middle">${conds[i].label}</text>`);
    parts.push(`<text x="${cx + colW / 2}" y="${condY + 24 * FS}" font-family="${F}" font-size="${24 * FS}" font-weight="800" fill="${conds[i].color}" text-anchor="middle">${conds[i].value}</text>`);
  }

  // Footer text
  const by = isStory ? H - 36 : H - 28;
  parts.push(`<text x="${W / 2}" y="${by}" font-family="${F}" font-size="${16 * FS}" font-weight="700" fill="#94a3b8" text-anchor="middle">meteo.tecrural.es</text>`);

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
