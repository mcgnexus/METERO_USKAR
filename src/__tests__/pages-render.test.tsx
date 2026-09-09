// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mockUsePathname = vi.fn(() => '/huescar');
vi.setConfig({ testTimeout: 30_000 });

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/services/huescarWeatherService', () => ({
  getHuescarWeatherResponse: vi.fn(),
}));

import { HoyPageClient } from '@/components/HoyPageClient';
import { HorasPageClient } from '@/components/HorasPageClient';
import { SemanaPageClient } from '@/components/SemanaPageClient';
import { CampoPageClient } from '@/components/CampoPageClient';
import { AlertasPageClient } from '@/components/AlertasPageClient';
import { FuentesPageClient } from '@/components/FuentesPageClient';
import { buildHuescarResponse, RAIF_PAYLOAD } from './fixtures/huescarResponse';

function stubFetch(raifPayload: unknown = RAIF_PAYLOAD): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/events')) {
      return new Response(JSON.stringify({ ok: true }), { status: 201 });
    }
    if (url.includes('/api/weather/raif')) {
      return new Response(JSON.stringify(raifPayload), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as ReturnType<typeof vi.fn>;
}

describe('Carga de las pantallas públicas (render de clientes de página)', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = stubFetch();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('/huescar — HoyPageClient renderiza con datos del snapshot', () => {
    const response = buildHuescarResponse();
    render(<HoyPageClient response={response} />);
    expect(screen.getByRole('heading', { name: /El tiempo que te ayuda a decidir en Huéscar/ })).toBeTruthy();
  });

  it('/huescar/horas — HorasPageClient renderiza', () => {
    const response = buildHuescarResponse();
    render(<HorasPageClient response={response} />);
    expect(screen.getByRole('heading', { name: 'Pronóstico por horas' })).toBeTruthy();
  });

  it('/huescar/semana — SemanaPageClient renderiza', () => {
    const response = buildHuescarResponse();
    render(<SemanaPageClient response={response} />);
    expect(screen.getByRole('heading', { name: 'Tendencia semanal' })).toBeTruthy();
  });

  it('/huescar/campo — CampoPageClient renderiza', () => {
    const response = buildHuescarResponse();
    render(<CampoPageClient response={response} />);
    expect(screen.getByRole('heading', { name: 'Campo' })).toBeTruthy();
  });

  it('/huescar/alertas — AlertasPageClient renderiza secciones por categoría', () => {
    mockUsePathname.mockReturnValue('/huescar/alertas');
    const response = buildHuescarResponse();
    render(<AlertasPageClient response={response} />);
    expect(screen.getByText(/Alertas meteorológicas/)).toBeTruthy();
    expect(screen.getByText(/Avisos fitosanitarios/)).toBeTruthy();
    expect(screen.getByText(/Recomendaciones agrícolas/)).toBeTruthy();
  });

  it('estado de fuente obsoleta — FuentesPageClient marca la fuente Desactualizada', () => {
    const response = buildHuescarResponse({ staleSources: true });
    render(<FuentesPageClient response={response} />);
    expect(screen.getByText(/Desactualizada/i)).toBeTruthy();
    // La fuente fresca sigue Activa (varias fuentes activas → getAllByText)
    expect(screen.getAllByText(/Activa/i).length).toBeGreaterThan(0);
  });

  it('alertas: 0 meteorológicas + RAIF activo → se muestran AMBAS situaciones', async () => {
    mockUsePathname.mockReturnValue('/huescar/alertas');
    const response = buildHuescarResponse({ alerts: [] });
    render(<AlertasPageClient response={response} />);
    // Situación meteorológica en calma, con ámbito explícito
    expect(await screen.findByText('Sin alertas meteorológicas activas')).toBeTruthy();
    // Aviso fitosanitario activo visible a la vez (nunca un único "0 alertas")
    expect(await screen.findByText(/Aviso por Prays oleae/)).toBeTruthy();
  });
});
