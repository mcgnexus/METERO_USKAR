import { NextRequest, NextResponse } from 'next/server';

const OFFICIAL_ORIGIN = 'https://meteo.tecrural.es';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase() ?? '';

  if (hostname.endsWith('.vercel.app')) {
    const destination = new URL(request.nextUrl.pathname + request.nextUrl.search, OFFICIAL_ORIGIN);
    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
