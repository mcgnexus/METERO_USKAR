import { NextResponse } from "next/server";

const AEMET_API_KEY = process.env.AEMET_API_KEY || "";
const RADAR_ENDPOINT = "https://opendata.aemet.es/opendata/api/red/radar/regional/am";
const CACHE_TTL_MS = 8 * 60 * 1000; // 8 minutos (AEMET actualiza cada ~10 min)

/**
 * Usamos globalThis para que la caché persista entre hot-reloads de Next.js en desarrollo.
 * En producción los módulos no se reinician, pero globalThis sigue siendo la forma correcta.
 */
declare global {
  // eslint-disable-next-line no-var
  var __radarCache: {
    buffer: Buffer | null;
    contentType: string;
    expiresAt: number;
    fetchingPromise: Promise<Buffer> | null; // evita peticiones en paralelo
  } | undefined;
}

if (!globalThis.__radarCache) {
  globalThis.__radarCache = {
    buffer: null,
    contentType: "image/gif",
    expiresAt: 0,
    fetchingPromise: null,
  };
}

const cache = globalThis.__radarCache;

function toResponseBody(buffer: Buffer): Uint8Array<ArrayBuffer> {
  return new Uint8Array(buffer);
}

async function fetchFromAEMET(): Promise<Buffer> {
  // Paso 1: URL de la imagen
  const metaRes = await fetch(`${RADAR_ENDPOINT}?api_key=${AEMET_API_KEY}`, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" },
    // Next.js fetch caching: no-store para siempre ir al origen en el servidor
    cache: "no-store",
  });

  if (metaRes.status === 429) {
    throw Object.assign(new Error("Rate limit AEMET (429)"), { status: 429 });
  }
  if (!metaRes.ok) {
    throw new Error(`AEMET meta error: ${metaRes.status}`);
  }

  const metaJson = await metaRes.json();
  const imageUrl: string | undefined = metaJson?.datos;
  if (!imageUrl) {
    throw new Error("AEMET no devolvió 'datos' con la URL de imagen");
  }

  // Paso 2: Descargar imagen binaria
  const imgRes = await fetch(imageUrl, {
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!imgRes.ok) {
    throw new Error(`Error descargando imagen de radar: ${imgRes.status}`);
  }

  const contentType = imgRes.headers.get("content-type") || "image/gif";
  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Actualizar caché global
  cache.buffer = buffer;
  cache.contentType = contentType;
  cache.expiresAt = Date.now() + CACHE_TTL_MS;

  return buffer;
}

export async function GET(): Promise<NextResponse> {
  // ── 1. Caché válida → responder directamente ──────────────────────────────
  if (cache.buffer && Date.now() < cache.expiresAt) {
    return new NextResponse(toResponseBody(cache.buffer), {
      status: 200,
      headers: {
        "Content-Type": cache.contentType,
        "Cache-Control": `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
        "X-Radar-Source": "cache",
      },
    });
  }

  if (!AEMET_API_KEY) {
    return NextResponse.json({ error: "AEMET API key no configurada" }, { status: 503 });
  }

  // ── 2. Deduplicar peticiones concurrentes ─────────────────────────────────
  //    Si ya hay una petición en vuelo, esperamos a que termine en lugar
  //    de lanzar otra (evita varios 429 simultáneos).
  if (!cache.fetchingPromise) {
    cache.fetchingPromise = fetchFromAEMET().finally(() => {
      cache.fetchingPromise = null;
    });
  }

  try {
    const buffer = await cache.fetchingPromise;
    return new NextResponse(toResponseBody(buffer), {
      status: 200,
      headers: {
        "Content-Type": cache.contentType,
        "Cache-Control": `public, max-age=${Math.floor(CACHE_TTL_MS / 1000)}`,
        "X-Radar-Source": "live",
      },
    });
  } catch (e: unknown) {
    const err = e as Error & { status?: number };
    console.error("[Radar Image Proxy] Error:", err.message);

    // ── 3. Fallback: caché expirada si existe ──────────────────────────────
    if (cache.buffer) {
      console.warn("[Radar Image Proxy] Sirviendo caché expirada como fallback");
      return new NextResponse(toResponseBody(cache.buffer), {
        status: 200,
        headers: {
          "Content-Type": cache.contentType,
          "Cache-Control": "public, max-age=60",
          "X-Radar-Source": "stale-cache",
        },
      });
    }

    // ── 4. Sin caché disponible ────────────────────────────────────────────
    const httpStatus = err.status === 429 ? 429 : 503;
    return NextResponse.json(
      { error: err.message || "No se pudo obtener la imagen de radar" },
      { status: httpStatus }
    );
  }
}
