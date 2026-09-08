import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { consumeLeadAttempt, initializeDatabase, withdrawLeadConsent } from '@/lib/weatherStore';
import { PHONE_REGEX, normalizePhone } from '@/lib/leadSchema';

/** Máximo de solicitudes de retirada por IP y hora. */
const WITHDRAW_MAX_ATTEMPTS = 5;
const WITHDRAW_WINDOW_MS = 60 * 60_000;

const withdrawSchema = z.object({
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(PHONE_REGEX)
    .refine((value) => value.replace(/\D/g, '').length >= 7)
    .transform(normalizePhone),
  /** Finalidad cuya autorización se retira: comercial o avisos. */
  purpose: z.enum(['commercial', 'service_alerts']),
});

function clientKey(request: NextRequest): string {
  const address =
    request.headers.get('x-vercel-forwarded-for')
    ?? request.headers.get('x-real-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()
    ?? 'unknown';
  return crypto.createHash('sha256').update(address).digest('hex');
}

/**
 * POST /api/leads/consent — retirada de consentimiento por finalidad.
 *
 * Revocable en cualquier momento y por separado: la retirada comercial NO
 * afecta a los avisos meteorológicos y viceversa. Responde siempre 200 con
 * mensaje genérico para no revelar si un teléfono tiene leads (enumeración).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
  }

  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Introduce un teléfono válido y la finalidad cuya autorización quieres retirar.' },
      { status: 400 },
    );
  }

  try {
    await initializeDatabase();
    if (!(await consumeLeadAttempt(`withdraw:${clientKey(request)}`, WITHDRAW_MAX_ATTEMPTS, WITHDRAW_WINDOW_MS))) {
      return NextResponse.json(
        { error: 'Has alcanzado el límite de solicitudes. Inténtalo más tarde.' },
        { status: 429 },
      );
    }

    await withdrawLeadConsent(parsed.data.phone, parsed.data.purpose);
    // Mensaje idéntico haya o no coincidencias: no se filtra información.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/leads/consent] Error interno:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 });
  }
}
