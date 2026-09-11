import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/services/pushService';

/**
 * Aviso de prueba solicitado por el propio usuario desde el panel de estado.
 * Solo permite el envío al endpoint de suscripción del propio navegador
 * (mismo origen, sin secretos de cron y sin afectar a otras suscripciones).
 */
export async function POST(req: Request): Promise<NextResponse> {
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Origen inválido' }, { status: 403 });
    }
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { endpoint?: string };
    const result = await sendTestNotification(body.endpoint);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Error al enviar notificacion' }, { status: 500 });
  }
}
