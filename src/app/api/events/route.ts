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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    const event = text(body?.event, 40);
    if (!event) {
      return NextResponse.json({ error: 'Evento no válido.' }, { status: 400 });
    }

    const page = text(body?.page, 200);
    const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? body.metadata as Record<string, unknown>
      : undefined;

    await initializeDatabase();
    if (!(await consumeEventAttempt(clientKey(request)))) {
      return NextResponse.json({ error: 'Demasiados eventos. Inténtalo más tarde.' }, { status: 429 });
    }
    const saved = await recordBusinessEvent({
      event,
      page: page || undefined,
      metadata,
      ipHash: clientKey(request),
    });

    if (!saved) {
      return NextResponse.json({ error: 'Evento no registrado.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar el evento.' }, { status: 400 });
  }
}
