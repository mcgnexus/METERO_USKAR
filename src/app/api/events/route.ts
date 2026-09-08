import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { consumeEventAttempt, initializeDatabase, recordBusinessEvent } from '@/lib/weatherStore';

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function clientKey(request: NextRequest): string {
  const address = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    ?? 'unknown';
  return crypto.createHash('sha256').update(address).digest('hex');
}

/** Tipo de dispositivo derivado del User-Agent (sin cookies ni fingerprinting). */
function deviceTypeFrom(request: NextRequest): string {
  const ua = request.headers.get('user-agent') ?? '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|iPhone|Android.*Mobile|Windows Phone/i.test(ua)) return 'mobile';
  if (ua) return 'desktop';
  return 'unknown';
}

/**
 * Claves de metadata permitidas en analítica. Cualquier otra clave
 * (phone, name, email, …) se DESCARTA: nunca se persisten datos personales
 * en la analítica, ni siquiera por accidente del cliente.
 */
const ALLOWED_METADATA_KEYS = new Set([
  'municipality',
  'crop',
  'interest',
  'interests',
  'context',
  'cta',
  'destination',
  'source',
  'reason',
  'level',
  'status',
]);

/** Patrón de teléfono: cualquier valor con pinta de número de contacto se filtra. */
const PHONE_LIKE = /\+?\d[\d\s().-]{6,}\d/;

function sanitizeMetadata(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!ALLOWED_METADATA_KEYS.has(key)) continue;
    if (typeof value === 'string') {
      const clean = value.trim().slice(0, 100);
      out[key] = PHONE_LIKE.test(clean) ? '[filtered]' : clean;
    } else if (Array.isArray(value)) {
      const clean = value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => (PHONE_LIKE.test(item) ? '[filtered]' : item.trim().slice(0, 100)))
        .slice(0, 10);
      out[key] = clean;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * POST /api/events — analítica de conversión respetando privacidad.
 *
 * Se registran SOLO eventos de la allowlist con dimensiones agregadas:
 * página, página de entrada, campaña UTM, tipo de dispositivo y metadata
 * permitida (municipio, cultivo, interés). Jamás teléfonos, nombres ni
 * otros datos personales (se descartan en servidor, no se confía en el cliente).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const event = text(body?.event, 40);
    if (!event) {
      return NextResponse.json({ error: 'Evento no válido.' }, { status: 400 });
    }

    const page = text(body?.page, 200);
    const entryPage = text(body?.entryPage, 200);
    const utmCampaign = text(body?.utmCampaign, 100);
    const metadata = sanitizeMetadata(body?.metadata);

    await initializeDatabase();
    if (!(await consumeEventAttempt(clientKey(request)))) {
      return NextResponse.json({ error: 'Demasiados eventos. Inténtalo más tarde.' }, { status: 429 });
    }
    const saved = await recordBusinessEvent({
      event,
      page: page || undefined,
      metadata,
      ipHash: clientKey(request),
      deviceType: deviceTypeFrom(request),
      entryPage: entryPage || undefined,
      utmCampaign: utmCampaign || undefined,
    });

    if (!saved) {
      return NextResponse.json({ error: 'Evento no registrado.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 400 });
  }
}
