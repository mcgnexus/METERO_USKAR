import { NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/services/cronAuth';
import { sendTestNotification } from '@/services/pushService';

export async function POST(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization');
  if (!verifyCronAuthorization(authHeader)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  try {
    const result = await sendTestNotification();
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Error al enviar notificacion' }, { status: 500 });
  }
}
