import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { WeatherAlert } from "@/types/weather";

const CACHE_KEY = "aemet_warnings";
const CACHE_TTL_MS = 30 * 60 * 1000;
const CAP_URL = "https://opendata.aemet.es/opendata/api/avisos_cap/ultimos";

const GRANADA_PROVINCES = ["Granada", "Huescar", "Almanzora", "Valle del Almanzora", "Cazorla"];

function isRelevantWarning(title: string, message: string): boolean {
  const text = `${title} ${message}`.toLowerCase();
  return GRANADA_PROVINCES.some((p) => text.includes(p.toLowerCase()));
}

function parseCAPtoAlerts(xmlText: string): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const capRegex = /<cap:alert>([\s\S]*?)<\/cap:alert>/gi;
  let alertMatch: RegExpExecArray | null;

  while ((alertMatch = capRegex.exec(xmlText)) !== null) {
    const alertXml = alertMatch[1];
    const infoRegex = /<cap:info>([\s\S]*?)<\/cap:info>/gi;
    let infoMatch: RegExpExecArray | null;

    while ((infoMatch = infoRegex.exec(alertXml)) !== null) {
      const infoXml = infoMatch[1];
      const extract = (tag: string) => {
        const m = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i").exec(infoXml);
        return m ? m[1].trim() : "";
      };

      const event = extract("event");
      const headline = extract("headline") || extract("description");
      const severity = extract("severity").toLowerCase();
      const instruction = extract("instruction");

      if (!event) continue;

      const level: WeatherAlert["level"] = severity.includes("extreme") || severity.includes("severe")
        ? "severo"
        : severity.includes("moderate")
          ? "peligro"
          : "aviso";

      const title = event;
      const message = [headline, instruction].filter(Boolean).join(" - ");

      if (isRelevantWarning(title, message)) {
        alerts.push({ type: event, level, title, message });
      }
    }
  }

  return alerts;
}

export async function fetchAEMETWarnings(): Promise<WeatherAlert[]> {
  const cached = cacheGet<WeatherAlert[]>(CACHE_KEY);
  if (cached) return cached;

  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) return [];

  try {
    const metaUrl = `${CAP_URL}?api_key=${apiKey}`;
    const metaRes = await fetch(metaUrl, { signal: AbortSignal.timeout(10000) });
    if (!metaRes.ok) return [];
    const metaJson = await metaRes.json();
    if (!metaJson || !metaJson.datos) return [];

    const dataRes = await fetch(metaJson.datos, { signal: AbortSignal.timeout(10000) });
    if (!dataRes.ok) return [];

    const xmlText = await dataRes.text();
    const alerts = parseCAPtoAlerts(xmlText);

    cacheSet(CACHE_KEY, alerts, CACHE_TTL_MS);
    return alerts;
  } catch {
    return [];
  }
}
