import { vi, describe, it, expect, beforeEach } from 'vitest';

const {
  mockInitializeDatabase,
  mockConsumeLeadAttempt,
  mockSaveAgriculturalLead,
  mockFindRecentLead,
  mockSetLeadNotificationStatus,
  mockNotifyNewLead,
  mockClaimLeadIdempotencyKey,
  mockAttachLeadIdempotencyLead,
  mockReleaseLeadIdempotencyKey,
  mockFindRecentLeadWithinMinutes,
  mockRecordLeadConsents,
} = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockConsumeLeadAttempt: vi.fn(),
  mockSaveAgriculturalLead: vi.fn(),
  mockFindRecentLead: vi.fn(),
  mockSetLeadNotificationStatus: vi.fn(),
  mockNotifyNewLead: vi.fn(),
  mockClaimLeadIdempotencyKey: vi.fn(),
  mockAttachLeadIdempotencyLead: vi.fn(),
  mockReleaseLeadIdempotencyKey: vi.fn(),
  mockFindRecentLeadWithinMinutes: vi.fn(),
  mockRecordLeadConsents: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  consumeLeadAttempt: mockConsumeLeadAttempt,
  saveAgriculturalLead: mockSaveAgriculturalLead,
  findRecentLead: mockFindRecentLead,
  setLeadNotificationStatus: mockSetLeadNotificationStatus,
  claimLeadIdempotencyKey: mockClaimLeadIdempotencyKey,
  attachLeadIdempotencyLead: mockAttachLeadIdempotencyLead,
  releaseLeadIdempotencyKey: mockReleaseLeadIdempotencyKey,
  findRecentLeadWithinMinutes: mockFindRecentLeadWithinMinutes,
  recordLeadConsents: mockRecordLeadConsents,
}));

vi.mock('@/services/telegramNotify', () => ({
  notifyNewLead: mockNotifyNewLead,
}));

import { POST } from '@/app/api/leads/route';
import { CONSENT_POLICY_VERSION } from '@/lib/leadSchema';

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
    mockClaimLeadIdempotencyKey.mockResolvedValue('new');
    mockAttachLeadIdempotencyLead.mockResolvedValue(undefined);
    mockReleaseLeadIdempotencyKey.mockResolvedValue(undefined);
    mockFindRecentLeadWithinMinutes.mockResolvedValue(false);
    mockRecordLeadConsents.mockResolvedValue(undefined);
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

  // === Anti-duplicados y anti-spam ===

  it('idempotencia: clave reclamada se asocia al leadId guardado', async () => {
    const res = await POST(mockRequest(VALID_LEAD, { 'Idempotency-Key': '11111111-2222-3333-4444-555555555555' }));
    expect(res.status).toBe(201);
    expect(mockClaimLeadIdempotencyKey).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555');
    expect(mockAttachLeadIdempotencyLead).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555', 123);
  });

  it('idempotencia: clave repetida → 200 duplicado SIN guardar ni notificar', async () => {
    mockClaimLeadIdempotencyKey.mockResolvedValue('exists');
    const res = await POST(mockRequest(VALID_LEAD, { 'Idempotency-Key': '11111111-2222-3333-4444-555555555555' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
    expect(mockNotifyNewLead).not.toHaveBeenCalled();
  });

  it('idempotencia: clave con formato inválido se ignora (no bloquea el envío)', async () => {
    const res = await POST(mockRequest(VALID_LEAD, { 'Idempotency-Key': 'corta' }));
    expect(res.status).toBe(201);
    expect(mockClaimLeadIdempotencyKey).not.toHaveBeenCalled();
    expect(mockSaveAgriculturalLead).toHaveBeenCalledTimes(1);
  });

  it('rate limit teléfono: IP ok pero teléfono supera el límite → 429 sin guardar', async () => {
    mockConsumeLeadAttempt
      .mockResolvedValueOnce(true) // límite IP
      .mockResolvedValueOnce(false); // límite teléfono
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(429);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
    expect(mockNotifyNewLead).not.toHaveBeenCalled();
    // La segunda ventana usa una clave derivada del teléfono, no la de IP
    const phoneBucket = mockConsumeLeadAttempt.mock.calls[1]?.[0] as string | undefined;
    expect(phoneBucket).toMatch(/^tel:/);
    expect(phoneBucket).not.toBe(mockConsumeLeadAttempt.mock.calls[0]?.[0]);
  });

  it('rate limit IP: primera ventana agotada → 429 sin guardar', async () => {
    mockConsumeLeadAttempt.mockResolvedValue(false);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(429);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
  });

  it('dedup: mismo teléfono en los últimos 30 min → 200 duplicado sin reinsertar', async () => {
    mockFindRecentLeadWithinMinutes.mockResolvedValue(true);
    const res = await POST(mockRequest(VALID_LEAD));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.duplicate).toBe(true);
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
    expect(mockNotifyNewLead).not.toHaveBeenCalled();
  });

  it('honeypot: se rechaza ANTES de consumir cuota de rate limit', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, website: 'http://spam.example' }));
    expect(res.status).toBe(400);
    expect(mockConsumeLeadAttempt).not.toHaveBeenCalled();
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
  });

  it('normalización: teléfono con separadores se guarda homogéneo', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, phone: '+34 614-242-716' }));
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(expect.objectContaining({ phone: '+34614242716' }));
  });

  it('400: teléfono sin 7 dígitos reales (solo separadores) se rechaza', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, phone: '(()) --- ()' }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.fieldErrors?.phone).toBeTruthy();
    expect(mockSaveAgriculturalLead).not.toHaveBeenCalled();
  });

  it('saneado: municipio sin caracteres de control ni ángulos', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, municipality: ' Puebla de Don Fadrique \u0000<script>' }));
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ municipality: 'Puebla de Don Fadrique script' }),
    );
  });

  it('dedupe de intereses: seleccionar el mismo interés dos veces guarda uno', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, interests: ['Heladas', 'Heladas'] }));
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(expect.objectContaining({ interests: ['Heladas'] }));
  });

  it('fallo al guardar libera la clave de idempotencia para el reintento', async () => {
    mockSaveAgriculturalLead.mockResolvedValue(null);
    const res = await POST(mockRequest(VALID_LEAD, { 'Idempotency-Key': '11111111-2222-3333-4444-555555555555' }));
    expect(res.status).toBe(500);
    expect(mockReleaseLeadIdempotencyKey).toHaveBeenCalledWith('11111111-2222-3333-4444-555555555555');
  });

  // === Evidencia de consentimientos ===

  it('consentimientos: registra evidencia de AMBAS finalidades con canales y versión de política', async () => {
    const res = await POST(mockRequest({ ...VALID_LEAD, marketingConsent: true }));
    expect(res.status).toBe(201);
    expect(mockRecordLeadConsents).toHaveBeenCalledWith(
      123,
      [
        { purpose: 'service_alerts', granted: true, channels: ['whatsapp', 'notificaciones'] },
        { purpose: 'commercial', granted: true, channels: ['whatsapp', 'email', 'notificaciones'] },
      ],
      CONSENT_POLICY_VERSION,
    );
  });

  it('consentimientos: comercial RECHAZADA también queda registrada (se ofreció por separado)', async () => {
    await POST(mockRequest(VALID_LEAD)); // marketingConsent: false
    expect(mockRecordLeadConsents).toHaveBeenCalledTimes(1);
    const consents = mockRecordLeadConsents.mock.calls[0][1] as Array<{ purpose: string; granted: boolean }>;
    const commercial = consents.find((consent) => consent.purpose === 'commercial');
    expect(commercial?.granted).toBe(false);
    const service = consents.find((consent) => consent.purpose === 'service_alerts');
    expect(service?.granted).toBe(true);
  });
});
