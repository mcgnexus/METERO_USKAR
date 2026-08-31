import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { consumeLeadAttempt, initializeDatabase, saveAgriculturalLead } from '@/lib/weatherStore';

const CROPS = new Set(['Olivar', 'Almendro', 'Pistacho', 'Hortícola', 'Otro']);
const AREAS = new Set(['Menos de 5 ha', '5-20 ha', '20-50 ha', 'Más de 50 ha', 'Prefiero no decirlo']);
const INTERESTS = new Set([
  'Avisos de helada',
  'Recomendaciones de riego',
  'Sensores para mi finca',
  'Diagnóstico agrícola',
  'Riego',
  'Heladas',
  'Sensores',
  'Diagnóstico de plantas',
  'Automatización',
  'Información sobre Terracía',
]);

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
    if (text(body?.website, 20)) {
      return NextResponse.json({ error: 'Solicitud no válida.' }, { status: 400 });
    }

    const name = text(body?.name, 80);
    const phone = text(body?.phone, 30);
    const municipality = text(body?.municipality, 80);
    const crop = text(body?.crop, 30);
    const area = text(body?.area, 30);
    const interests = Array.isArray(body?.interests)
      ? body.interests.filter((value: unknown): value is string => typeof value === 'string' && INTERESTS.has(value)).slice(0, 5)
      : [];

    if (!municipality || !CROPS.has(crop) || (area && !AREAS.has(area)) || interests.length === 0) {
      return NextResponse.json({ error: 'Completa los datos de la finca y selecciona al menos un interés.' }, { status: 400 });
    }
    if (!/^[+0-9 ()-]{7,30}$/.test(phone)) {
      return NextResponse.json({ error: 'Introduce un teléfono o WhatsApp válido.' }, { status: 400 });
    }
    if (body?.meteorologicalConsent !== true) {
      return NextResponse.json({ error: 'Debes aceptar los avisos meteorológicos para enviar la solicitud.' }, { status: 400 });
    }

    await initializeDatabase();
    if (!(await consumeLeadAttempt(clientKey(request)))) {
      return NextResponse.json({ error: 'Has alcanzado el límite de solicitudes. Inténtalo más tarde.' }, { status: 429 });
    }

    const saved = await saveAgriculturalLead({
      name,
      phone,
      municipality,
      crop,
      area,
      interests,
      meteorologicalConsent: true,
      commercialConsent: body?.commercialConsent === true,
      ipHash: clientKey(request),
      source: text(body?.source, 40) || 'direct',
      landingPage: text(body?.landingPage, 200) || '/',
      utmSource: text(body?.utmSource, 100) || undefined,
      utmMedium: text(body?.utmMedium, 100) || undefined,
      utmCampaign: text(body?.utmCampaign, 100) || undefined,
    });
    if (!saved) return NextResponse.json({ error: 'No se pudo guardar la solicitud.' }, { status: 503 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 400 });
  }
}
