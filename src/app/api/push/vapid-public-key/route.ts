import { NextResponse } from 'next/server';

export async function GET(): Promise<NextResponse> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID no configurado' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
