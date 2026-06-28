import type { ClimateCalibrationPayload } from "@/types/climate";

export function ascii(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "");
}

export type Platform = "ig" | "og" | "story";

export function platformSize(p: Platform): { width: number; height: number } {
  switch (p) {
    case "og": return { width: 1200, height: 630 };
    case "story": return { width: 1080, height: 1920 };
    default: return { width: 1080, height: 1080 };
  }
}

export function platformLabel(p: Platform): string {
  switch (p) {
    case "og": return "Facebook / WhatsApp";
    case "story": return "Instagram / WhatsApp Story";
    default: return "Instagram / Redes";
  }
}

export function weatherIcon(code: number): string {
  if (code === 0) return "\u2600\uFE0F";
  if (code <= 3) return "\u26C5";
  if (code <= 48) return "\uD83C\uDF2B\uFE0F";
  if (code <= 55) return "\uD83D\uDCA7";
  if (code <= 65) return "\uD83C\uDF27\uFE0F";
  if (code <= 75) return "\u2744\uFE0F";
  if (code <= 82) return "\uD83C\uDF26\uFE0F";
  if (code <= 99) return "\u26C8\uFE0F";
  return "\u2753";
}

export function windDirLabel(deg: number | null | undefined): string {
  if (deg == null) return "--";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function weatherDesc(code: number): string {
  const m: Record<number, string> = {
    0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
    45: "Niebla", 48: "Niebla con escarcha", 51: "Llovizna", 55: "Llovizna densa",
    61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia fuerte",
    71: "Nevada ligera", 73: "Nevada moderada", 75: "Nevada fuerte",
    80: "Chubascos", 82: "Chubascos fuertes", 95: "Tormenta", 99: "Tormenta fuerte",
  };
  return m[code] ?? "Variable";
}

export function formatDateLong(): string {
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const days = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
}

export function fireRiskLevel(cd: ClimateCalibrationPayload): { level: string; color: string } {
  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 20;
  const humPct = cd.nodes.localStation?.humidityPct ?? cd.eto.inputs.humidityPct ?? 50;
  const wind = cd.nodes.radiationWind.windSpeed2mKmh;
  const cloud = cd.exoticVariables.cloudCoverPct;
  let score = 0;
  if (temp >= 35) score += 3;
  else if (temp >= 30) score += 2;
  else if (temp >= 25) score += 1;
  if (humPct <= 25) score += 3;
  else if (humPct <= 40) score += 2;
  else if (humPct <= 55) score += 1;
  if (wind >= 40) score += 2;
  else if (wind >= 25) score += 1;
  if (cloud !== null && cloud < 30) score += 1;
  if (score >= 7) return { level: "EXTREMO", color: "#dc2626" };
  if (score >= 5) return { level: "ALTO", color: "#ea580c" };
  if (score >= 3) return { level: "MODERADO", color: "#eab308" };
  return { level: "BAJO", color: "#16a34a" };
}

export const CARD_COLORS = {
  bg: "#0f172a",
  cardBg: "#1e293b",
  border: "#334155",
  textPrimary: "#f8fafc",
  textSecondary: "#94a3b8",
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  orange: "#ea580c",
  purple: "#a78bfa",
};
