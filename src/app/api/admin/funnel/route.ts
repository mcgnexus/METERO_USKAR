import { NextRequest, NextResponse } from 'next/server';
import { getFunnelMetrics } from '@/lib/weatherStore';
import { getAdminFromRequest } from '@/services/adminAuth';

/**
 * GET /api/admin/funnel?days=30&municipality=&utm=
 * Embudo de conversión agregado con tasas por paso, filtrable por municipio y
 * campaña UTM. Solo acceso de administrador (cookie sesión).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = request.nextUrl?.searchParams;
  const daysRaw = sp ? parseInt(sp.get('days') ?? '30', 10) : 30;
  const daysBack = Number.isFinite(daysRaw) ? Math.max(7, Math.min(365, daysRaw)) : 30;
  const municipality = sp?.get('municipality')?.trim() || undefined;
  const utmCampaign = sp?.get('utm')?.trim() || undefined;

  try {
    const report = await getFunnelMetrics({ daysBack, municipality, utmCampaign });
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error en el embudo' },
      { status: 500 },
    );
  }
}