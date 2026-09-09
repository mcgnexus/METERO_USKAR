import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

describe('official host redirect', () => {
  it('redirects Vercel hostnames to the official domain preserving path and query', () => {
    const request = new NextRequest('https://tecrural-metereologia.vercel.app/huescar?view=horas', {
      headers: { host: 'tecrural-metereologia.vercel.app' },
    });
    const response = middleware(request);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://meteo.tecrural.es/huescar?view=horas');
  });

  it('does not redirect the official domain', () => {
    const request = new NextRequest('https://meteo.tecrural.es/huescar', {
      headers: { host: 'meteo.tecrural.es' },
    });
    expect(middleware(request).status).toBe(200);
  });

  it('does not redirect localhost', () => {
    const request = new NextRequest('http://localhost:3000/huescar', {
      headers: { host: 'localhost:3000' },
    });
    expect(middleware(request).status).toBe(200);
  });

  it('redirige la raíz del dominio plataforma en un solo salto a /huescar', () => {
    const request = new NextRequest('https://tecrural-metereologia.vercel.app/?utm_source=campana', {
      headers: { host: 'tecrural-metereologia.vercel.app' },
    });
    const response = middleware(request);

    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://meteo.tecrural.es/huescar?utm_source=campana');
  });

  it('no redirige los deployments de preview (conservan su propio host)', () => {
    const request = new NextRequest('https://tecrural-metereologia-test.vercel.app/huescar', {
      headers: { host: 'tecrural-metereologia-test.vercel.app' },
    });
    expect(middleware(request).status).toBe(200);
  });
});
