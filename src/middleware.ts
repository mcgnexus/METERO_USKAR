import { NextRequest, NextResponse } from 'next/server';

/**
 * Dominio canónico: TODOS los enlaces compartidos y campañas deben apuntar aquí
 * (meteo.tecrural.es). El subdominio de plataforma de Vercel
 * (tecrural-metereologia.vercel.app) realiza una ÚNICA redirección permanente
 * (308) hacia el canónico conservando ruta y parámetros UTM, para no duplicar
 * latencia con saltos intermedios.
 */
const CANONICAL_ORIGIN = 'https://meteo.tecrural.es';
/** Home agrícola destino cuando se llega a la raíz (evita el 2.º salto / → /huescar). */
const HOME_PATH = '/huescar';
/** Única redirección que se aplica: el subdominio de producción de la plataforma Vercel. */
const PLATFORM_ORIGIN = 'tecrural-metereologia.vercel.app';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase() ?? '';

  // Solo el dominio de la aplicación en producción. Los deployments de preview
  // (tecrural-metereologia-*.vercel.app) se dejan sin tocar para poder revisarlos.
  if (hostname === PLATFORM_ORIGIN) {
    const path = request.nextUrl.pathname === '/' ? HOME_PATH : request.nextUrl.pathname;
    const destination = new URL(path + request.nextUrl.search, CANONICAL_ORIGIN);
    return NextResponse.redirect(destination, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};