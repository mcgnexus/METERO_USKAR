import { NextResponse } from 'next/server';
import { subscribe } from '@/services/pushService';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ error: 'Suscripcion incompleta' }, { status: 400 });
    }

    await subscribe(endpoint, keys.p256dh, keys.auth);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error al suscribir' }, { status: 500 });
  }
}
