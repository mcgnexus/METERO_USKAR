import { vi, describe, it, expect, beforeEach } from 'vitest';

const {
  mockInitializeDatabase,
  mockConsumeLeadAttempt,
  mockSaveAgriculturalLead,
  mockFindRecentLead,
  mockSetLeadNotificationStatus,
  mockNotifyNewLead,
} = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockConsumeLeadAttempt: vi.fn(),
  mockSaveAgriculturalLead: vi.fn(),
  mockFindRecentLead: vi.fn(),
  mockSetLeadNotificationStatus: vi.fn(),
  mockNotifyNewLead: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  consumeLeadAttempt: mockConsumeLeadAttempt,
  saveAgriculturalLead: mockSaveAgriculturalLead,
  findRecentLead: mockFindRecentLead,
  setLeadNotificationStatus: mockSetLeadNotificationStatus,
}));

vi.mock('@/services/telegramNotify', () => ({
  notifyNewLead: mockNotifyNewLead,
}));

import { POST } from '@/app/api/leads/route';

type Postable = Parameters<typeof POST>[0];

function mockRequest(body: unknown, headers?: Record<string, string>): Postable {
  return new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as Postable;
}

const VALID_LEAD = {
  name: 'Juan Pérez',
  phone: '614242716',
  municipality: 'Huéscar',
  crop: 'Olivar',
  interests: ['Avisos de helada', 'Recomendaciones de riego'],
  serviceConsent: true,
  marketingConsent: false,
};

describe('POST /api/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockConsumeLeadAttempt.mockResolvedValue(true);
    mockSaveAgriculturalLead.mockResolvedValue(123); // leadId
    mockFindRecentLead.mockResolvedValue(false);
    mockSetLeadNotificationStatus.mockResolvedValue(undefined);
    mockNotifyNewLead.mockResolvedValue(true);
  });

  it('201: guarda un lead válido con los campos del contrato', async () => {
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '614242716',
        municipality: 'Huéscar',
        crop: 'Olivar',
        meteorologicalConsent: true,
        commercialConsent: false,
      }),
    );
  });

  it('201: guarda ANTES de notificar y devuelve el leadId', async () => {
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.leadId).toBe(123);
    // Orden: primero guardar, después notificar
    const saveCall = mockSaveAgriculturalLead.mock.invocationCallOrder[0];
    const notifyCall = mockNotifyNewLead.mock.invocationCallOrder[0];
    expect(saveCall).toBeLessThan(notifyCall);
    expect(mockNotifyNewLead).toHaveBeenCalledWith(expect.objectContaining({ leadId: 123 }));
    // Estado de notificación registrado
    expect(mockSetLeadNotificationStatus).toHaveBeenCalledWith(123, 'notified');
  });

  it('201: si Telegram falla, el lead se conserva y se marca notification_failed', async () => {
    mockNotifyNewLead.mockResolvedValue(false);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.leadId).toBe(123);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledTimes(1);
    expect(mockSetLeadNotificationStatus).toHaveBeenCalledWith(123, 'notification_failed');
  });

  it('500: si NO se pudo guardar, no se notifica a Telegram', async () => {
    mockSaveAgriculturalLead.mockResolvedValue(null);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(500);
    expect(mockNotifyNewLead).not.toHaveBeenCalled();
    expect(mockSetLeadNotificationStatus).not.toHaveBeenCalled();
  });

  it('201: mapea campaign → utmCampaign y guarda source', async () => {
    const res = await POST(
      mockRequest({ ...VALID_LEAD, source: 'meteo-huescar', campaign: 'primavera-2026' }),
    );
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'meteo-huescar', utmCampaign: 'primavera-2026' }),
    );
  });

  it('400: teléfono inválido devuelve fieldErrors por campo', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, phone: 'no-soy-un-teléfono' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.phone).toBeTruthy();
  });

  it('400: faltan campos obligatorios y serviceConsent false', async () => {
    const res = await POST(
      mockRequest({ phone: '', municipality: '', crop: '', serviceConsent: false }),
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.phone).toBeTruthy();
    expect(json.fieldErrors?.municipality).toBeTruthy();
    expect(json.fieldErrors?.crop).toBeTruthy();
    expect(json.fieldErrors?.serviceConsent).toBeTruthy();
  });

  it('400: honeypot rellenado se rechaza', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, website: 'http://spam.example' }));
    expect(res.status).toBe(400);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
  });

  it('400: JSON malformado', async () => {
    const res = await POST(mockRequest('{no-json'));
    expect(res.status).toBe(400);
  });

  it('429: cuando se supera el límite de solicitudes', async () => {
    mockConsumeLeadAttempt.mockResolvedValue(false);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(429);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
  });

  it('200: duplicado reciente devuelve éxito idempotente sin reinsertar', async () => {
    mockFindRecentLead.mockResolvedValue(true);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
  });

  it('500: fallo al guardar devuelve error interno', async () => {
    mockSaveAgriculturalLead.mockResolvedValue(null);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(500);
  });

  it('defaults: source "direct" y landingPage "/" cuando no se envían', async () => {
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'direct', landingPage: '/' }),
    );
  });
});
