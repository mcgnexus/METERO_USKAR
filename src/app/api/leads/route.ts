import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { consumeLeadAttempt, findRecentLead, initializeDatabase, saveAgriculturalLead, setLeadNotificationStatus } from '@/lib/weatherStore';
import { notifyNewLead } from '@/services/telegramNotify';
import { leadFormSchema, fieldErrorsFromZod } from '@/lib/leadSchema';

function clientKey(request: NextRequest): string {
  const address = request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    ?? 'unknown';
  return crypto.createHash('sha256').update(address).digest('hex');
}

/**
 * POST /api/leads — guardado de leads agrícolas.
 *
 * Validación en servidor con el esquema Zod compartido (nunca se confía en
 * la validación del navegador). Respuestas diferenciadas:
 *   201 → lead guardado · 200 → duplicado reciente (idempotente)
 *   400 → datos incorrectos (incluye fieldErrors por campo)
 *   429 → demasiadas solicitudes · 500 → error interno
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  }

  try {
    // Honeypot anti-spam: los bots rellenan campos ocultos.
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
    if (!(await consumeLeadAttempt(clientKey(request)))) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de solicitudes. Inténtalo más tarde.' },
        { status: 429 },
      );
    }

    // Envíos duplicados: mismo teléfono + municipio en los últimos 7 días.
    if (await findRecentLead(data.phone, data.municipality)) {
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
      ipHash: clientKey(request),
      source: data.source || 'direct',
      landingPage: data.landingPage || '/',
      utmSource: data.utmSource || undefined,
      utmMedium: data.utmMedium || undefined,
      utmCampaign: data.campaign || undefined,
    });
    if (leadId == null) {
      return NextResponse.json({ error: 'No se pudo guardar la solicitud. Inténtalo de nuevo.' }, { status: 500 });
    }

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
    console.error('[api/leads] Error interno:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 });
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
