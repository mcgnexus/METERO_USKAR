import { ImageResponse } from "next/og";
import { getClimateCalibrationPayload } from "@/services/climateCalibrationPayloadService";
import { getCurrentWeatherPayload } from "@/services/currentWeatherService";
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
  advice: string[];
  fireRisk: { level: string; color: string };
  dateLabel: string;
  unavailable: boolean;
};

function generateAdvice(w: Pick<WeatherPayload, "current" | "hourly" | "alerts" | "daily">, cd: ClimateCalibrationPayload): string[] {
  const tips: string[] = [];
  const max = w.daily?.temperatureMaxC?.[0];
  const min = w.daily?.temperatureMinC?.[0];
  const precip = w.hourly?.precipitationProbabilityPct?.[0] ?? 0;
  const wind = w.current?.windGustKmh ?? 0;
  const humidity = w.current?.humidityPct ?? 50;
  const frost = cd.dewPoint.frostRisk;

  if (frost === "muy_alta") tips.push("\u2744\uFE0F Riesgo de helada muy alto. Cubrir plantas sensibles, regar antes del anochecer");
  else if (frost === "alta") tips.push("\u2744\uFE0F Riesgo de helada alto. Proteger cultivos sensibles al frio");
  else if (frost === "media") tips.push("\u2757\uFE0F Posible helada. Vigilar cultivos jovenes y florales");

  if (max !== undefined && max >= 38) tips.push("\uD83D\uDD25 Ola de calor. Proteger cultivos sensibles, aumentar frecuencia de riego");
  else if (max !== undefined && max >= 32) tips.push("\u2600\uFE0F Riego temprano (antes de 8h). Evitar tratamientos foliares al mediodia");

  if (min !== undefined && min <= 2) tips.push("\u2744\uFE0F Riesgo de helada. Cubrir plantas sensibles, regar antes del anochecer");

  if (precip >= 60) tips.push("\uD83C\uDF27\uFE0F Lluvia esperada. Suspender tratamientos fitosanitarios, revisar drenajes");

  if (wind >= 50) tips.push("\uD83D\uDCA8 Viento muy fuerte. No aplicar pulverizaciones, revisar estructuras y tutores");
  else if (wind >= 40) tips.push("\uD83D\uDCA8 Viento fuerte. No aplicar pulverizaciones, revisar estructuras");

  if (humidity <= 30) tips.push("\uD83C\uDFDC\uFE0F Baja humedad. Aumentar riego, vigilar estres hidrico en cultivos");

  const hasAemetAlert = w.alerts.some((a) => a.level === "severo" || a.level === "peligro");
  if (hasAemetAlert) {
    const alert = w.alerts.find((a) => a.level === "severo" || a.level === "peligro");
    if (alert) tips.push(`\u26A0\uFE0F AEMET: ${alert.title}`);
  }

  if (tips.length === 0) tips.push("Condiciones normales para la epoca. Riego de mantenimiento");

  return tips.slice(0, 3);
}

function fireRiskLevel(cd: ClimateCalibrationPayload): { level: string; color: string } {
  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 20;
  const humidity = cd.nodes.radiationWind.windSpeed2mKmh;
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

function formatDateLong(): string {
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const days = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
  const now = new Date();
  return `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]}`;
}

function windDirLabel(deg: number | null | undefined): string {
  if (deg == null) return "--";
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function weatherIcon(code: number): string {
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

function weatherDesc(code: number): string {
  const m: Record<number, string> = {
    0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
    45: "Niebla", 48: "Niebla con escarcha", 51: "Llovizna", 55: "Llovizna densa",
    61: "Lluvia ligera", 63: "Lluvia moderada", 65: "Lluvia fuerte",
    71: "Nevada ligera", 73: "Nevada moderada", 75: "Nevada fuerte",
    80: "Chubascos", 82: "Chubascos fuertes", 95: "Tormenta", 99: "Tormenta fuerte",
  };
  return m[code] ?? "Variable";
}

async function buildCardData(): Promise<CardData> {
  const fallback: CardData = {
    tempMax: 0, tempMin: 0, feelsLike: 0, weatherCode: 0,
    humidity: 0, windSpeed: 0, windDir: "--", precipProb: 0, et0: 0,
    frostRisk: "none", aemetAlerts: [], advice: ["Datos temporalmente no disponibles"],
    fireRisk: { level: "--", color: "#64748b" }, dateLabel: formatDateLong(), unavailable: true,
  };

  try {
    const [climateResult, weatherResult] = await Promise.allSettled([
      getClimateCalibrationPayload(),
      getCurrentWeatherPayload(),
    ]);

    const cd = climateResult.status === "fulfilled" ? climateResult.value : null;
    const w = weatherResult.status === "fulfilled" ? weatherResult.value : null;

    if (!cd || !w) return fallback;

    const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
    const max = w.daily?.temperatureMaxC?.[0];
    const min = w.daily?.temperatureMinC?.[0];

    const advice = generateAdvice(w, cd);
    const fire = fireRiskLevel(cd);

    const alerts = w.alerts
      .filter((a) => a.level === "severo" || a.level === "peligro")
      .map((a) => a.title);

    return {
      tempMax: max ?? temp,
      tempMin: min ?? temp,
      feelsLike: w.current.apparentTemperatureC ?? temp,
      weatherCode: w.current.weatherCode ?? 0,
      humidity: w.current.humidityPct ?? cd.nodes.localStation?.humidityPct ?? 0,
      windSpeed: w.current.windGustKmh ?? 0,
      windDir: windDirLabel(w.current.windDirectionDeg ?? cd.extrapolation.bazaWindDirectionDeg),
      precipProb: w.hourly?.precipitationProbabilityPct?.[0] ?? 0,
      et0: cd.eto.etoHourlyMm ?? 0,
      frostRisk: cd.dewPoint.frostRisk,
      aemetAlerts: alerts,
      advice,
      fireRisk: fire,
      dateLabel: formatDateLong(),
      unavailable: false,
    };
  } catch {
    return fallback;
  }
}

function renderCard(d: CardData): React.ReactElement {
  const W = 1080;
  const H = 1080;
  const pad = 48;

  const bg = "#0f172a";
  const cardBg = "#1e293b";
  const border = "#334155";
  const textPrimary = "#f8fafc";
  const textSecondary = "#94a3b8";
  const accentBlue = "#3b82f6";
  const accentGreen = "#22c55e";

  return (
    <div style={{ width: W, height: H, background: bg, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", padding: pad }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 38, fontWeight: 800, color: textPrimary }}>
            {"\uD83C\uDF24\uFE0F"} Meteo Huéscar
          </div>
          <div style={{ fontSize: 26, color: textSecondary, marginTop: 4 }}>{d.dateLabel}</div>
        </div>
        <div style={{ fontSize: 64 }}>{weatherIcon(d.weatherCode)}</div>
      </div>

      {/* Temperature block */}
      <div style={{ background: cardBg, borderRadius: 20, border: `2px solid ${border}`, padding: "24px 28px", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: accentBlue, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
          Temperaturas
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 22, color: textSecondary }}>Max</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: "#ef4444" }}>{Math.round(d.tempMax)}°</div>
          </div>
          <div style={{ width: 2, height: 60, background: border }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 22, color: textSecondary }}>Min</div>
            <div style={{ fontSize: 52, fontWeight: 800, color: "#3b82f6" }}>{Math.round(d.tempMin)}°</div>
          </div>
          <div style={{ width: 2, height: 60, background: border }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 22, color: textSecondary }}>Sensacion</div>
            <div style={{ fontSize: 44, fontWeight: 700, color: textPrimary }}>{Math.round(d.feelsLike)}°</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 28, color: textPrimary }}>{weatherDesc(d.weatherCode)}</div>
          </div>
        </div>
      </div>

      {/* Agro data grid */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[
          { label: "ET0", value: d.et0 > 0 ? `${d.et0.toFixed(1)} mm` : "--", accent: accentGreen },
          { label: "Humedad", value: `${Math.round(d.humidity)}%`, accent: "#38bdf8" },
          { label: "Viento", value: `${Math.round(d.windSpeed)} km/h ${d.windDir}`, accent: "#a78bfa" },
          { label: "Lluvia", value: `${Math.round(d.precipProb)}%`, accent: "#38bdf8" },
        ].map((item) => (
          <div key={item.label} style={{ flex: 1, background: cardBg, borderRadius: 16, border: `1px solid ${border}`, padding: "16px 12px" }}>
            <div style={{ fontSize: 18, color: textSecondary, marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: item.accent }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Advice block */}
      <div style={{ background: cardBg, borderRadius: 20, border: `2px solid ${border}`, padding: "20px 24px", marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: accentGreen, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
          Consejos del dia
        </div>
        {d.advice.map((tip, i) => (
          <div key={i} style={{ fontSize: 24, color: textPrimary, lineHeight: 1.4, marginBottom: i < d.advice.length - 1 ? 8 : 0 }}>
            {tip}
          </div>
        ))}
      </div>

      {/* Fire risk + AEMET alerts row */}
      <div style={{ display: "flex", gap: 16, marginBottom: "auto" }}>
        <div style={{ flex: 1, background: cardBg, borderRadius: 16, border: `1px solid ${border}`, padding: "16px 20px" }}>
          <div style={{ fontSize: 18, color: textSecondary, marginBottom: 6 }}>Riesgo incendio</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: d.fireRisk.color }}>{d.fireRisk.level}</div>
        </div>
        {d.aemetAlerts.length > 0 && (
          <div style={{ flex: 1, background: cardBg, borderRadius: 16, border: "2px solid #dc2626", padding: "16px 20px" }}>
            <div style={{ fontSize: 18, color: "#fca5a5", marginBottom: 6 }}>Alerta AEMET</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#fca5a5" }}>{d.aemetAlerts[0]}</div>
          </div>
        )}
        {d.frostRisk !== "none" && d.frostRisk !== "unknown" && (
          <div style={{ flex: 1, background: cardBg, borderRadius: 16, border: "2px solid #38bdf8", padding: "16px 20px" }}>
            <div style={{ fontSize: 18, color: "#93c5fd", marginBottom: 6 }}>Helada</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#93c5fd" }}>
              {d.frostRisk === "muy_alta" ? "Riesgo muy alto" : d.frostRisk === "alta" ? "Riesgo alto" : "Riesgo medio"}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: `1px solid ${border}` }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: textSecondary }}>meteo.tecrural.es</div>
        <div style={{ fontSize: 18, color: "#475569" }}>Datos hiperlocales para Huescar</div>
      </div>
    </div>
  );
}

export async function GET() {
  const data = await buildCardData();

  return new ImageResponse(renderCard(data), {
    width: 1080,
    height: 1080,
  });
}
