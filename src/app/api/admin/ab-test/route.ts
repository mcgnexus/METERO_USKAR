import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/services/adminAuth';
import { getAbTestMetrics, initializeDatabase } from '@/lib/weatherStore';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeDatabase();
    const report = await getAbTestMetrics();
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: 'No se pudieron calcular las métricas del experimento.' }, { status: 500 });
  }
}