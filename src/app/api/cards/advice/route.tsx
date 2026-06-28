import { ImageResponse } from "next/og";
import { getClimateCalibrationPayload } from "@/services/climateCalibrationPayloadService";
import { getCurrentWeatherPayload } from "@/services/currentWeatherService";
import { generalAdvice } from "@/lib/weather-advice/generalAdvice";
import { clothingAdvice } from "@/lib/weather-advice/clothingAdvice";
import { walkingAdvice } from "@/lib/weather-advice/walkingAdvice";
import { platformSize, weatherIcon, windDirLabel, formatDateLong, fireRiskLevel, CARD_COLORS as C } from "@/lib/card-utils";
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
  tips: { emoji: string; text: string }[];
  dateLabel: string;
  unavailable: boolean;
};

function buildAdviceCtx(cd: ClimateCalibrationPayload, w: WeatherPayload): AdviceContext {
  const local = cd.nodes.localStation;
  const temp = cd.calibration.realTemperatureC ?? cd.interpolation.estimatedTemperatureC ?? 0;
  const humidity = local?.humidityPct ?? cd.eto.inputs.humidityPct ?? w.current.humidityPct ?? 50;
  const windSpeed = cd.nodes.radiationWind.windSpeed2mKmh ?? 0;
  const windGust = w.current.windGustKmh ?? null;
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
    windGustKmh: windGust,
    precipitationProbPct: w.hourly?.precipitationProbabilityPct?.[0] ?? null,
    precipitationMm: w.hourly?.precipitationMm?.[0] ?? null,
    cloudCoverPct: cd.exoticVariables.cloudCoverPct ?? null,
    weatherCode: w.current.weatherCode ?? 0,
    isDaytime: madridHour >= 7 && madridHour < 20,
    month: utcMonth,
    season: utcMonth >= 3 && utcMonth <= 5 ? "spring" : utcMonth >= 6 && utcMonth <= 8 ? "summer" : utcMonth >= 9 && utcMonth <= 11 ? "autumn" : "winter",
  };
}

function generateAgriTips(cd: ClimateCalibrationPayload, w: WeatherPayload): { emoji: string; text: string }[] {
  const tips: { emoji: string; text: string }[] = [];
  const precip = w.hourly?.precipitationProbabilityPct?.[0] ?? 0;
  const wind = w.current.windGustKmh ?? 0;
  const max = w.daily?.temperatureMaxC?.[0];
  const min = w.daily?.temperatureMinC?.[0];
  const frost = cd.dewPoint.frostRisk;

  if (frost === "muy_alta" || frost === "alta" || (min !== undefined && min <= 2)) {
    tips.push({ emoji: "\u2744\uFE0F", text: `Riesgo de helada ${frost === "muy_alta" ? "muy alto" : frost === "alta" ? "alto" : ""}. Cubrir plantas sensibles, regar antes del anochecer` });
  }
  if (max !== undefined && max >= 38) {
    tips.push({ emoji: "\uD83D\uDD25", text: "Ola de calor. Proteger cultivos sensibles, aumentar frecuencia de riego" });
  } else if (max !== undefined && max >= 32) {
    tips.push({ emoji: "\u2600\uFE0F", text: "Riego temprano antes de las 8h. Evitar tratamientos foliares al mediodia" });
  }
  if (precip >= 60) {
    tips.push({ emoji: "\uD83C\uDF27\uFE0F", text: `Lluvia esperada (${precip}%). Suspender fitosanitarios, revisar drenajes` });
  }
  if (wind >= 50) {
    tips.push({ emoji: "\uD83D\uDCA8", text: `Viento muy fuerte (${Math.round(wind)} km/h). No aplicar pulverizaciones` });
  } else if (wind >= 40) {
    tips.push({ emoji: "\uD83D\uDCA8", text: `Viento fuerte (${Math.round(wind)} km/h). Revisar estructuras y tutores` });
  }
  if ((cd.eto.etoHourlyMm ?? 0) >= 0.5) {
    tips.push({ emoji: "\uD83D\uDCA7", text: `ET0 alta (${cd.eto.etoHourlyMm?.toFixed(1)} mm). Ajustar riego` });
  }
  if (tips.length === 0) {
    tips.push({ emoji: "\u2705", text: "Condiciones normales para la epoca. Riego de mantenimiento" });
  }
  return tips.slice(0, 4);
}

async function buildData(): Promise<AdviceCardData> {
  const fallback: AdviceCardData = {
    ctx: { tempC: 0, feelsLikeC: 0, humidityPct: null, windSpeedKmh: 0, windGustKmh: null, precipitationProbPct: null, precipitationMm: null, cloudCoverPct: null, weatherCode: 0, isDaytime: true, month: 6, season: "summer" },
    weatherCode: 0, windDir: "--", precipMm: null, et0: 0,
    fireRisk: { level: "--", color: "#64748b" }, frostRisk: "none",
    tips: [{ emoji: "\u274C", text: "Datos temporalmente no disponibles" }],
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
    const fire = fireRiskLevel(cd);

    const tips: { emoji: string; text: string }[] = [];
    const statusEmoji: Record<string, string> = { good: "\u2705", caution: "\u26A0\uFE0F", bad: "\u274C", neutral: "\u2139\uFE0F" };
    tips.push({ emoji: statusEmoji[general.status] ?? "\u2139\uFE0F", text: `${general.title}: ${general.label}` });
    if (clothing.label) tips.push({ emoji: "\uD83D\uDC56", text: clothing.label });
    if (walking.label) tips.push({ emoji: "\uD83D\uDEB6", text: walking.label });
    const agri = generateAgriTips(cd, w);
    tips.push(...agri);

    return {
      ctx,
      weatherCode: w.current.weatherCode ?? 0,
      windDir: windDirLabel(cd.extrapolation.bazaWindDirectionDeg),
      precipMm: w.hourly?.precipitationMm?.[0] ?? null,
      et0: cd.eto.etoHourlyMm ?? 0,
      fireRisk: fire,
      frostRisk: cd.dewPoint.frostRisk,
      tips: tips.slice(0, 5),
      dateLabel: formatDateLong(),
      unavailable: false,
    };
  } catch { return fallback; }
}

function Card({ d, W, H }: { d: AdviceCardData; W: number; H: number }) {
  const isStory = H > W;
  const pad = isStory ? 48 : 40;

  return (
    <div style={{ width: W, height: H, background: C.bg, display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif", padding: pad }}>
      {isStory && <div style={{ flex: 1 }} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isStory ? 40 : 24 }}>
        <div>
          <div style={{ fontSize: isStory ? 42 : 32, fontWeight: 800, color: C.textPrimary }}>
            {"\uD83C\uDF24\uFE0F"} Meteo Huéscar
          </div>
          <div style={{ fontSize: isStory ? 26 : 20, color: C.textSecondary, marginTop: 4 }}>{d.dateLabel}</div>
        </div>
        <div style={{ fontSize: isStory ? 72 : 52 }}>{weatherIcon(d.weatherCode)}</div>
      </div>

      {d.unavailable ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 32, color: C.textSecondary }}>Datos temporalmente no disponibles</div>
        </div>
      ) : (
        <>
          {/* Quick conditions strip */}
          <div style={{ display: "flex", gap: 12, marginBottom: isStory ? 28 : 20 }}>
            {[
              { label: "Temp", value: `${Math.round(d.ctx.tempC)}°`, color: C.red },
              { label: "Sensacion", value: `${Math.round(d.ctx.feelsLikeC)}°`, color: C.blue },
              { label: "Viento", value: `${Math.round(d.ctx.windSpeedKmh)} ${d.windDir}`, color: C.amber },
              { label: "Lluvia", value: d.precipMm != null ? `${d.precipMm.toFixed(1)} mm` : "--", color: C.blue },
            ].map((m) => (
              <div key={m.label} style={{ flex: 1, background: C.cardBg, borderRadius: 14, border: `1px solid ${C.border}`, padding: "12px 10px" }}>
                <div style={{ fontSize: isStory ? 18 : 14, color: C.textSecondary, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: isStory ? 26 : 22, fontWeight: 800, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div style={{ background: C.cardBg, borderRadius: 20, border: `2px solid ${C.border}`, padding: isStory ? "28px" : "20px 24px", marginBottom: isStory ? 24 : 16 }}>
            <div style={{ fontSize: isStory ? 28 : 22, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 2, marginBottom: isStory ? 16 : 12 }}>
              Consejos del dia
            </div>
            {d.tips.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: isStory ? 16 : 12, marginBottom: i < d.tips.length - 1 ? (isStory ? 16 : 10) : 0 }}>
                <div style={{ fontSize: isStory ? 30 : 24, minWidth: isStory ? 36 : 30 }}>{t.emoji}</div>
                <div style={{ fontSize: isStory ? 24 : 20, color: C.textPrimary, lineHeight: 1.45 }}>{t.text}</div>
              </div>
            ))}
          </div>

          {/* Fire risk + frost */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1, background: C.cardBg, borderRadius: 16, border: `1px solid ${C.border}`, padding: "14px 18px" }}>
              <div style={{ fontSize: isStory ? 18 : 14, color: C.textSecondary, marginBottom: 4 }}>Riesgo incendio</div>
              <div style={{ fontSize: isStory ? 30 : 24, fontWeight: 800, color: d.fireRisk.color }}>{d.fireRisk.level}</div>
            </div>
            {d.frostRisk !== "none" && d.frostRisk !== "unknown" && (
              <div style={{ flex: 1, background: C.cardBg, borderRadius: 16, border: "2px solid #38bdf8", padding: "14px 18px" }}>
                <div style={{ fontSize: isStory ? 18 : 14, color: "#93c5fd", marginBottom: 4 }}>Helada</div>
                <div style={{ fontSize: isStory ? 30 : 24, fontWeight: 700, color: "#93c5fd" }}>
                  {d.frostRisk === "muy_alta" ? "Muy alto" : d.frostRisk === "alta" ? "Alto" : "Medio"}
                </div>
              </div>
            )}
            {d.et0 > 0 && (
              <div style={{ flex: 1, background: C.cardBg, borderRadius: 16, border: `1px solid ${C.border}`, padding: "14px 18px" }}>
                <div style={{ fontSize: isStory ? 18 : 14, color: C.textSecondary, marginBottom: 4 }}>ET0</div>
                <div style={{ fontSize: isStory ? 30 : 24, fontWeight: 800, color: C.green }}>{d.et0.toFixed(1)} mm</div>
              </div>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", paddingTop: isStory ? 40 : 16, fontSize: isStory ? 22 : 16, fontWeight: 700, color: C.textSecondary }}>
        meteo.tecrural.es
      </div>

      {isStory && <div style={{ flex: 0.5 }} />}
    </div>
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const platform = (url.searchParams.get("platform") ?? "ig") as "ig" | "og" | "story";
  const { width, height } = platformSize(platform);
  const data = await buildData();
  return new ImageResponse(Card({ d: data, W: width, H: height }), { width, height });
}
