import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  attachLeadIdempotencyLead,
  claimLeadIdempotencyKey,
  consumeLeadAttempt,
  findRecentLead,
  findRecentLeadWithinMinutes,
  initializeDatabase,
  recordLeadConsents,
  releaseLeadIdempotencyKey,
  saveAgriculturalLead,
  setLeadNotificationStatus,
} from '@/lib/weatherStore';
import { notifyNewLead } from '@/services/telegramNotify';
import {
  CONSENT_COMMERCIAL_CHANNELS,
  CONSENT_POLICY_VERSION,
  CONSENT_SERVICE_CHANNELS,
  leadFormSchema,
  fieldErrorsFromZod,
} from '@/lib/leadSchema';

/** Límite por IP: generoso con oficinas/NAT, duro con bots. */
const IP_MAX_ATTEMPTS = 5;
const IP_WINDOW_MS = 60 * 60_000;
/** Límite por teléfono: 3 envíos/hora, muy por encima de un uso legítimo. */
const PHONE_MAX_ATTEMPTS = 3;
const PHONE_WINDOW_MS = 60 * 60_000;

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    ?? 'unknown'
  );
}

function clientKey(request: NextRequest): string {
  return crypto.createHash('sha256').update(clientIp(request)).digest('hex');
}

function phoneKey(phone: string): string {
  return `tel:${crypto.createHash('sha256').update(phone).digest('hex')}`;
}

/** Clave de idempotencia enviada por el cliente: UUID/opaco, 8-64 caracteres seguros. */
function idempotencyKeyFrom(request: NextRequest): string | null {
  const raw = request.headers.get('idempotency-key')?.trim() ?? '';
  return /^[A-Za-z0-9-]{8,64}$/.test(raw) ? raw : null;
}

/**
 * POST /api/leads — guardado de leads agrícolas.
 *
 * Orden anti-duplicados y anti-spam:
 *   1. Honeypot en servidor → 400 sin tocar BD.
 *   2. Validación Zod compartida (longitudes y caracteres limitados) → 400.
 *   3. Rate limit por IP (5/h) y por teléfono (3/h) → 429.
 *   4. Clave de idempotencia: la primera petición reclama la clave; los
 *      reenvíos idénticos (doble clic, reintento de red) → 200 duplicado.
 *   5. Dedup en BD: mismo teléfono en 30 min o mismo teléfono+municipio
 *      en 7 días → 200 duplicado.
 *   6. Guardar → notificar → responder 201 con leadId.
 *
 * Nada rechazado (400/429/duplicado) llega a `agricultural_leads` ni a Telegram.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  }

  // Honeypot y clave de idempotencia se leen antes de validar el resto.
  const idemKey = idempotencyKeyFrom(request);

  try {
    // Honeypot anti-spam: los bots rellenan campos ocultos (validado en servidor).
    if (typeof body === 'object' && body !== null && text((body as Record<string, unknown>).website)) {
      return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
    }

    const parsed = leadFormSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Revisa los campos marcados antes de enviar.',
          fieldErrors: fieldErrorsFromZod(parsed.error),
        },
        { status: 400 },
      );
    }
    const data = parsed.data;

    await initializeDatabase();

    // Rate limit por IP y por teléfono (dos ventanas independientes).
    const ipKey = clientKey(request);
    if (!(await consumeLeadAttempt(`ip:${ipKey}`, IP_MAX_ATTEMPTS, IP_WINDOW_MS))) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de solicitudes. Inténtalo más tarde.' },
        { status: 429 },
      );
    }
    if (!(await consumeLeadAttempt(phoneKey(data.phone), PHONE_MAX_ATTEMPTS, PHONE_WINDOW_MS))) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de solicitudes para este teléfono. Inténtalo más tarde.' },
        { status: 429 },
      );
    }

    // Idempotencia: solo la primera petición con esta clave sigue adelante.
    if (idemKey && (await claimLeadIdempotencyKey(idemKey)) === 'exists') {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    // Envíos duplicados: mismo teléfono en 30 min, o mismo teléfono+municipio en 7 días.
    if ((await findRecentLeadWithinMinutes(data.phone)) || (await findRecentLead(data.phone, data.municipality))) {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    // 1) GUARDAR primero: el lead persiste aunque Telegram falle después.
    const leadId = await saveAgriculturalLead({
      name: data.name ?? '',
      phone: data.phone,
      municipality: data.municipality,
      crop: data.crop,
      area: data.area ?? '',
      interests: data.interests,
      meteorologicalConsent: true,
      commercialConsent: data.marketingConsent === true,
      ipHash: ipKey,
      source: data.source || 'direct',
      landingPage: data.landingPage || '/',
      utmSource: data.utmSource || undefined,
      utmMedium: data.utmMedium || undefined,
      utmCampaign: data.campaign || undefined,
      consentPolicyVersion: CONSENT_POLICY_VERSION,
      abVariant: data.abVariant,
    });
    if (leadId == null) {
      // No se guardó: liberar la clave para permitir reintento legítimo.
      if (idemKey) await releaseLeadIdempotencyKey(idemKey);
      return NextResponse.json({ error: 'No se pudo guardar la solicitud. Inténtalo de nuevo.' }, { status: 500 });
    }
    if (idemKey) await attachLeadIdempotencyLead(idemKey, leadId);

    // Evidencia de consentimiento: una fila por finalidad, con canales
    // informados y versión de política. Se registra SIEMPRE la comercial
    // (aceptada o rechazada) para demostrar que se ofreció por separado.
    await recordLeadConsents(
      leadId,
      [
        { purpose: 'service_alerts', granted: true, channels: [...CONSENT_SERVICE_CHANNELS] },
        { purpose: 'commercial', granted: data.marketingConsent === true, channels: [...CONSENT_COMMERCIAL_CHANNELS] },
      ],
      CONSENT_POLICY_VERSION,
    );

    // 2) NOTIFICAR por Telegram (fuente secundaria): si falla, el lead se
    //    conserva con estado notification_failed y el cron lo reintenta.
    const notified = await notifyNewLead({
      leadId,
      name: data.name ?? '',
      phone: data.phone,
      municipality: data.municipality,
      crop: data.crop,
      area: data.area ?? '',
      interests: data.interests,
    });
    if (notified) {
      await setLeadNotificationStatus(leadId, 'notified');
    } else {
      console.error(`[api/leads] Notificación Telegram fallida para lead ${leadId}; quedará pendiente de reintento.`);
      await setLeadNotificationStatus(leadId, 'notification_failed');
    }

    // 3) RESPONDER éxito: el lead está guardado, Telegram es accesorio.
    return NextResponse.json({ ok: true, leadId }, { status: 201 });
  } catch (error) {
    // Si la clave se reclamó pero el flujo falló, liberarla para el reintento.
    if (idemKey) await releaseLeadIdempotencyKey(idemKey);
    console.error('[api/leads] Error interno:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 });
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
