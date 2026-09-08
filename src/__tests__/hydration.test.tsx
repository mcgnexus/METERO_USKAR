// @vitest-environment jsdom
/**
 * Ausencia del error React #418 (mismatch de hidratación).
 *
 * Estrategia: renderizamos el mismo componente con las mismas props en
 * servidor (renderToString) y en cliente (hydrateRoot sobre ese HTML), con
 * un espía en console.error. Si hay mismatch, React emite el error
 * "#418" / "Hydration failed" / "did not match" y el test falla.
 */
import { vi, describe, it, expect, afterEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { act } from 'react';

vi.setConfig({ testTimeout: 30_000 });

vi.mock('next/navigation', () => ({
  usePathname: () => '/huescar',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

/**
 * Reproduce la semántica de `next/dynamic` con ssr:false en producción:
 * durante la hidratación el chunk aún no está cargado y se pinta el
 * placeholder (el contenido real entra DESPUÉS de hidratar). Sin este mock,
 * el test cargaría el chunk al instante y produciría un mismatch ficticio.
 */
vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<unknown>,
    options?: { loading?: () => React.ReactElement; ssr?: boolean },
  ) => {
    void loader;
    const Loading = options?.loading ?? (() => null);
    function Loadable(): React.ReactElement {
      return <Loading />;
    }
    return Loadable;
  },
}));

import { HoyPageClient } from '@/components/HoyPageClient';
import { AlertasPageClient } from '@/components/AlertasPageClient';
import { HorasPageClient } from '@/components/HorasPageClient';
import { SemanaPageClient } from '@/components/SemanaPageClient';
import { buildHuescarResponse } from './fixtures/huescarResponse';

function stubGlobalFetch() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/weather/raif')) {
      return new Response(JSON.stringify({ alerts: [], count: 0, fetchedAt: '2026-09-08T10:00:00Z', source: 'RAIF', zone: 'granada_interior' }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  }));
}

const HYDRATION_ERROR_PATTERNS = ['418', '425', 'Hydration failed', 'did not match', 'hydrat'];

describe('Hidratación sin errores (React #418 ausente)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function expectNoHydrationErrors(element: React.ReactElement) {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    stubGlobalFetch();
    const html = renderToString(element);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);

    const recoverableErrors: string[] = [];
    const root = hydrateRoot(container, element, {
      onRecoverableError(error: unknown) {
        recoverableErrors.push(error instanceof Error ? (error.stack || error.message) : String(error));
      },
    });
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });
    root.unmount();
    container.remove();

    const errorText = consoleSpy.mock.calls.map((args) => args.map(String).join(' ')).join('\n');
    for (const pattern of HYDRATION_ERROR_PATTERNS) {
      expect(errorText, `console.error debería estar libre de "${pattern}":\n${errorText}`).not.toContain(pattern);
    }
    expect(recoverableErrors, 'hydrateRoot registró errores recuperables de hidratación').toEqual([]);
    consoleSpy.mockRestore();
    vi.unstubAllGlobals();
  }

  it('/huescar — HoyPageClient hidrata sin mismatch', async () => {
    const response = buildHuescarResponse();
    await expectNoHydrationErrors(<HoyPageClient response={response} />);
  });

  it('/huescar/horas — HorasPageClient hidrata sin mismatch', async () => {
    const response = buildHuescarResponse();
    await expectNoHydrationErrors(<HorasPageClient response={response} />);
  });

  it('/huescar/semana — SemanaPageClient hidrata sin mismatch', async () => {
    const response = buildHuescarResponse();
    await expectNoHydrationErrors(<SemanaPageClient response={response} />);
  });

  it('/huescar/alertas — AlertasPageClient hidrata sin mismatch', async () => {
    const response = buildHuescarResponse();
    await expectNoHydrationErrors(<AlertasPageClient response={response} />);
  });
});
