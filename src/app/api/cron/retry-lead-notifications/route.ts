import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuthorization } from '@/services/cronAuth';
import { notifyNewLead } from '@/services/telegramNotify';
import { findLeadsPendingNotification, initializeDatabase, setLeadNotificationStatus } from '@/lib/weatherStore';

/**
 * Reintenta la notificación Telegram de leads guardados cuya notificación
 * falló (notification_status 'new' | 'notification_failed'). El lead NUNCA
 * se elimina: solo se reintenta el aviso hasta 5 veces en 7 días.
 * Protegido con CRON_SECRET (vercel.json → crons).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get('Authorization');
  if (!verifyCronAuthorization(auth)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const pending = await findLeadsPendingNotification(20);

    let notified = 0;
    let failed = 0;
    for (const lead of pending) {
      const ok = await notifyNewLead({
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        municipality: lead.municipality,
        crop: lead.crop,
        area: lead.area,
        interests: lead.interests,
      });
      await setLeadNotificationStatus(lead.id, ok ? 'notified' : 'notification_failed');
      if (ok) notified += 1;
      else failed += 1;
    }

    console.log(`[cron/retry-lead-notifications] pendientes=${pending.length} notificados=${notified} fallidos=${failed}`);
    return NextResponse.json({ ok: true, pending: pending.length, notified, failed });
  } catch (error) {
    console.error('[cron/retry-lead-notifications] Error:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
