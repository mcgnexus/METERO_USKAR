export function fmt(value: number | null | undefined, digits: number = 1): string {
  if (value === null || value === undefined) return "--";
  return value.toLocaleString("es-ES", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function weatherEmoji(code: number): string {
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

export function windDirection(deg: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(deg / 22.5) % 16;
  return dirs[index];
}

export function dayLabel(dateStr: string): string {
  const days = ["domingo", "lunes", "martes", "mi\u00E9rcoles", "jueves", "viernes", "s\u00E1bado"];
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Hoy";
  if (d.toDateString() === tomorrow.toDateString()) return "Ma\u00F1ana";
  return days[d.getDay()];
}

export function temperatureColor(temp: number): string {
  if (temp >= 40) return "#dc2626";
  if (temp >= 35) return "#ea580c";
  if (temp >= 30) return "#f97316";
  if (temp >= 25) return "#eab308";
  if (temp >= 20) return "#84cc16";
  if (temp >= 10) return "#22c55e";
  if (temp >= 5) return "#06b6d4";
  if (temp >= 0) return "#3b82f6";
  return "#8b5cf6";
}

export function weatherCodeDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: "Despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna densa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada fuerte",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos fuertes",
    95: "Tormenta",
    96: "Tormenta con granizo ligero",
    99: "Tormenta con granizo fuerte",
  };
  return descriptions[code] ?? `C\u00F3digo ${code}`;
}

export function thiLevel(thi: number): string {
  if (thi < 68) return "Ninguno";
  if (thi < 72) return "Leve";
  if (thi < 80) return "Moderado";
  if (thi < 90) return "Severo";
  return "Peligroso";
}

export function frostRiskLabel(risk: string): string {
  switch (risk) {
    case "none": return "Sin riesgo";
    case "media": return "Riesgo medio";
    case "alta": return "Riesgo alto";
    case "muy_alta": return "Riesgo muy alto";
    default: return risk;
  }
}
