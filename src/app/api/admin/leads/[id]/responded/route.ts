import { NextRequest, NextResponse } from 'next/server';
import { markLeadResponded } from '@/lib/weatherStore';
import { getAdminFromRequest } from '@/services/adminAuth';

/**
 * POST /api/admin/leads/[id]/responded
 * Marca un lead como "respuesta" (el contacto por WhatsApp/Telegram avanzó o el
 * aviso resultó útil). Emite el evento canónico 'lead_responded' para el embudo.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const leadId = Number(id);
  if (!Number.isInteger(leadId) || leadId <= 0) {
    return NextResponse.json({ error: 'ID de lead no válido' }, { status: 400 });
  }

  try {
    const result = await markLeadResponded(leadId);
    if (!result.ok) {
      return NextResponse.json(
        { error: 'El lead no existe o ya estaba marcado como respondido' },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error al marcar el lead' },
      { status: 500 },
    );
  }
}