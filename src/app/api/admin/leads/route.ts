import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/services/adminAuth';
import { getRecentAgriculturalLeads, initializeDatabase } from '@/lib/weatherStore';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const leads = await getRecentAgriculturalLeads();
    return NextResponse.json({ leads });
  } catch {
    return NextResponse.json({ error: 'No se pudieron cargar las solicitudes.' }, { status: 500 });
  }
}
