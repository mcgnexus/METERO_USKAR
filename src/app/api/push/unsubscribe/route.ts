import { NextResponse } from 'next/server';
import { unsubscribe } from '@/services/pushService';

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 });
    }

    await unsubscribe(endpoint);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error al desuscribir' }, { status: 500 });
  }
}
