// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.setConfig({ testTimeout: 30_000 });

vi.mock('next/navigation', () => ({
  usePathname: () => '/huescar',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { AgriculturalLeadForm } from '@/components/AgriculturalLeadForm';

function leadResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status });
}

function stubLeadsFetch(responder: () => Response): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    if (String(input).includes('/api/leads')) return responder();
    return new Response(JSON.stringify({ ok: true }), { status: 201 });
  }) as ReturnType<typeof vi.fn>;
}

function openForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Quiero avisos para mi finca' }));
}

function fillAndAccept() {
  fireEvent.change(screen.getByLabelText(/Teléfono \/ WhatsApp/), { target: { value: '614242716' } });
  fireEvent.change(screen.getByLabelText('Municipio'), { target: { value: 'Huéscar' } });
  fireEvent.change(screen.getByLabelText(/^Cultivo/), { target: { value: 'Olivar' } });
  fireEvent.change(screen.getByLabelText(/Superficie aproximada/), { target: { value: '5-20 ha' } });
  fireEvent.click(screen.getByLabelText(/Avisos de helada/));
  fireEvent.click(screen.getByLabelText(/Acepto recibir los avisos solicitados/));
}

describe('Formulario de leads — estados y conversación', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('apertura y cierre del formulario', () => {
    vi.stubGlobal('fetch', stubLeadsFetch(() => leadResponse(201, { ok: true, leadId: 1 })));
    render(<AgriculturalLeadForm />);
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).toBeNull();
    openForm();
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).toBeNull();
  });

  it('validación: campos obligatorios muestran error bajo cada campo, sin mensaje nativo', () => {
    fetchMock = stubLeadsFetch(() => leadResponse(201, { ok: true, leadId: 1 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalLeadForm />);
    openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(screen.getByText('Introduce un teléfono o WhatsApp válido.')).toBeTruthy();
    expect(screen.getByText('Introduce el municipio.')).toBeTruthy();
    expect(screen.getByText('Selecciona un cultivo.')).toBeTruthy();
    expect(screen.getByText(/Debes aceptar los avisos/)).toBeTruthy();
    // El fetch NUNCA se llamó a /api/leads: nada inválido sale del navegador
    const leadCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/leads'));
    expect(leadCalls).toHaveLength(0);
  });

  it('envío simulado correcto → panel de éxito con resumen y anti reenvío', async () => {
    fetchMock = stubLeadsFetch(() => leadResponse(201, { ok: true, leadId: 42 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalLeadForm />);
    openForm();
    fillAndAccept();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('✅ Solicitud recibida')).toBeTruthy();
    expect(screen.getByText(/Municipio: Huéscar/)).toBeTruthy();
    expect(screen.getByText(/Cultivo: Olivar/)).toBeTruthy();
    expect(screen.getByText(/Intereses: Avisos de helada/)).toBeTruthy();
    expect(screen.getByText(/menos de 24 horas/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /Volver a la previsión/ })).toBeTruthy();
    // El formulario desaparece: no se puede reenviar accidentalmente
    expect(screen.queryByRole('button', { name: 'Enviar solicitud' })).toBeNull();
    const leadCalls = fetchMock.mock.calls.filter(([url]) => String(url) === '/api/leads');
    expect(leadCalls).toHaveLength(1);
    const [url, init] = leadCalls[0] as [string, RequestInit];
    expect(url).toBe('/api/leads');
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
  });

  it('duplicado reciente (200 duplicate) se trata como éxito sin error', async () => {
    fetchMock = stubLeadsFetch(() => leadResponse(200, { ok: true, duplicate: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalLeadForm />);
    openForm();
    fillAndAccept();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('✅ Solicitud recibida')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('fallo de Telegram (201 igualmente) muestra éxito: el lead está guardado', async () => {
    fetchMock = stubLeadsFetch(() => leadResponse(201, { ok: true, leadId: 7, notificationFailed: true }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalLeadForm />);
    openForm();
    fillAndAccept();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('✅ Solicitud recibida')).toBeTruthy();
  });

  it('fallo de envío: conserva datos, muestra Reintentar y alternativa WhatsApp', async () => {
    fetchMock = stubLeadsFetch(() => leadResponse(500, { error: 'No se pudo procesar la solicitud.' }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalLeadForm />);
    openForm();
    fillAndAccept();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    // Botón de reintento
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    // Alternativa WhatsApp
    expect(screen.getByText(/También puedes escribirnos por WhatsApp/)).toBeTruthy();
    // Datos conservados
    const phone = screen.getByLabelText(/Teléfono \/ WhatsApp/) as HTMLInputElement;
    expect(phone.value).toBe('614242716');
    const municipality = screen.getByLabelText('Municipio') as HTMLInputElement;
    expect(municipality.value).toBe('Huéscar');
    // Reintentar con éxito tras el fallo: misma clave de idempotencia (no duplica)
    fetchMock.mockImplementation(async () => leadResponse(201, { ok: true, leadId: 9 }));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('✅ Solicitud recibida')).toBeTruthy();
    const [, firstInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((firstInit.headers as Record<string, string>)['Idempotency-Key']).toBe(
      (secondInit.headers as Record<string, string>)['Idempotency-Key'],
    );
  });

  it('sin conexión: mensaje de red y el formulario no se borra', async () => {
    fetchMock = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as ReturnType<typeof vi.fn>;
    vi.stubGlobal('fetch', fetchMock);
    render(<AgriculturalLeadForm />);
    openForm();
    fillAndAccept();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText(/Sin conexión/)).toBeTruthy();
    const phone = screen.getByLabelText(/Teléfono \/ WhatsApp/) as HTMLInputElement;
    expect(phone.value).toBe('614242716');
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
  });
});
