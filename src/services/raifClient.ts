import { cacheGet, cacheSet } from "@/lib/inMemoryCache";
import type { RaifAlert, RaifAlertsPayload } from "@/types/raif";

const RAIF_BASE_URL = process.env.RAIF_BASE_URL || "https://raif-gamma.vercel.app";
const RAIF_API_KEY = process.env.RAIF_API_KEY || "";
const RAIF_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
const RAIF_TIMEOUT_MS = 8000;

let lastFailureAt = 0;
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

function isInCooldown(): boolean {
  return Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS;
}

async function callMcpMethod<T>(method: string, params: Record<string, unknown> = {}): Promise<T | null> {
  if (!RAIF_API_KEY) {
    console.warn("[RAIF] RAIF_API_KEY no configurada");
    return null;
  }
  if (isInCooldown()) {
    console.warn("[RAIF] En cooldown tras fallo previo");
    return null;
  }

  const body = JSON.stringify({
    jsonrpc: "2.0",
    method,
    params,
    id: 1,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Intentar varios formatos de autenticación por compatibilidad
  headers.Authorization = `Bearer ${RAIF_API_KEY}`;
  headers["X-API-Key"] = RAIF_API_KEY;
  headers["x-api-key"] = RAIF_API_KEY;

  try {
    const res = await fetch(`${RAIF_BASE_URL}/api/mcp`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(RAIF_TIMEOUT_MS),
    });

    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) {
        lastFailureAt = Date.now();
      }
      console.warn(`[RAIF] HTTP ${res.status} en ${method}`);
      return null;
    }

    const json = (await res.json()) as { result?: T; error?: unknown };
    if (json.error) {
      console.warn("[RAIF] Error JSON-RPC:", json.error);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    lastFailureAt = Date.now();
    console.warn("[RAIF] Excepción en fetch:", err);
    return null;
  }
}

export async function listRaifAlerts(filters: {
  cultivo?: string;
  zona?: string;
  provincia?: string;
  plaga?: string;
  severidad?: string;
  estado?: string;
  municipio?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
} = {}): Promise<RaifAlert[]> {
  const cacheKey = `raif:list:${JSON.stringify(filters)}`;
  const cached = cacheGet<RaifAlert[]>(cacheKey);
  if (cached) return cached;

  const result = await callMcpMethod<{ alertas?: RaifAlert[] }>("list_alerts", filters);
  const alerts = result?.alertas ?? [];

  if (alerts.length > 0) {
    cacheSet(cacheKey, alerts, RAIF_CACHE_TTL_MS);
  }
  return alerts;
}

export async function getRaifAlert(id: string): Promise<RaifAlert | null> {
  const cacheKey = `raif:alert:${id}`;
  const cached = cacheGet<RaifAlert>(cacheKey);
  if (cached) return cached;

  const result = await callMcpMethod<{ alerta?: RaifAlert }>("get_alert", { id });
  const alert = result?.alerta ?? null;

  if (alert) {
    cacheSet(cacheKey, alert, RAIF_CACHE_TTL_MS);
  }
  return alert;
}

export async function searchRaifAlerts(query: string, filters: {
  cultivo?: string;
  zona?: string;
  provincia?: string;
  plaga?: string;
  severidad?: string;
} = {}): Promise<RaifAlert[]> {
  const params = { q: query, ...filters };
  const result = await callMcpMethod<{ alertas?: RaifAlert[] }>("search_alerts", params);
  return result?.alertas ?? [];
}

export async function fetchRaifAlertsForZone(zone: string): Promise<RaifAlertsPayload> {
  const alerts = await listRaifAlerts({ zona: zone, estado: "active" });
  return {
    alerts,
    count: alerts.length,
    fetchedAt: new Date().toISOString(),
    source: "RAIF",
    zone,
  };
}
