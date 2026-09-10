import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockInitializeDatabase, mockConsumeEventAttempt, mockRecordBusinessEvent } = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockConsumeEventAttempt: vi.fn(),
  mockRecordBusinessEvent: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  consumeEventAttempt: mockConsumeEventAttempt,
  recordBusinessEvent: mockRecordBusinessEvent,
}));

import { POST } from '@/app/api/events/route';

type Postable = Parameters<typeof POST>[0];

function mockRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as unknown as Request & { nextUrl: URL };
}

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockConsumeEventAttempt.mockResolvedValue(true);
    mockRecordBusinessEvent.mockResolvedValue(true);
  });

  it('rejects empty event', async () => {
    const req = mockRequest({ event: '' });
    const res = await POST(req as Postable);
    expect(res.status).toBe(400);
  });

  it('rejects invalid event not in allowlist', async () => {
    mockRecordBusinessEvent.mockResolvedValue(false);
    const req = mockRequest({ event: 'invalid_event_name' });
    const res = await POST(req as Postable);
    expect(res.status).toBe(400);
  });

  it('accepts valid event with page', async () => {
    const req = mockRequest({ event: 'weather_view', page: '/huescar' });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'weather_view', page: '/huescar' }),
    );
  });

  it('accepts valid event with metadata', async () => {
    const meta = { crop: 'Olivar', municipality: 'Huéscar' };
    const req = mockRequest({ event: 'lead_form_submitted', metadata: meta });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'lead_form_submitted', metadata: meta }),
    );
  });

  it('accepts canonical funnel events', async () => {
    const events = [
      'weather_view', 'lead_cta_click', 'lead_form_open', 'lead_form_start',
      'lead_form_error', 'lead_form_submit', 'lead_form_success', 'whatsapp_click',
      'ab_test_assigned',
    ];
    for (const event of events) {
      mockRecordBusinessEvent.mockResolvedValue(true);
      const req = mockRequest({ event, page: '/huescar' });
      const res = await POST(req as Postable);
      expect(res.status).toBe(201);
    }
  });

  it('conserva la variante del experimento A/B como metadata', async () => {
    const req = mockRequest({
      event: 'ab_test_assigned',
      metadata: { experiment: 'lead-capture', variant: 'B' },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { experiment: 'lead-capture', variant: 'B' } }),
    );
  });

  it('conserva los parámetros UTM del embudo como metadata', async () => {
    const req = mockRequest({
      event: 'lead_cta_click',
      metadata: { municipality: 'Huéscar', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'regadio-2026' },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { municipality: 'Huéscar', utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'regadio-2026' },
      }),
    );
  });

  it('PRIVACIDAD: descarta claves con datos personales del metadata', async () => {
    const req = mockRequest({
      event: 'lead_form_success',
      metadata: {
        municipality: 'Huéscar',
        crop: 'Olivar',
        phone: '614242716',
        name: 'Juan Pérez',
        email: 'juan@example.com',
        notes: 'llamar al 614 24 27 16 por la tarde',
      },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    const metadata = mockRecordBusinessEvent.mock.calls[0][0].metadata as Record<string, unknown>;
    expect(metadata.municipality).toBe('Huéscar');
    expect(metadata.crop).toBe('Olivar');
    expect(metadata.phone).toBeUndefined();
    expect(metadata.name).toBeUndefined();
    expect(metadata.email).toBeUndefined();
    expect(metadata.notes).toBeUndefined();
  });

  it('PRIVACIDAD: valores con pinta de teléfono se sustituyen por [filtered]', async () => {
    const req = mockRequest({
      event: 'whatsapp_click',
      metadata: { context: 'contacto 614242716 gracias' },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    const metadata = mockRecordBusinessEvent.mock.calls[0][0].metadata as Record<string, unknown>;
    expect(metadata.context).toBe('[filtered]');
  });

  it('deriva el tipo de dispositivo del User-Agent', async () => {
    const mobile = await POST(mockRequest({ event: 'weather_view' }, { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }) as Postable);
    expect(mobile.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenLastCalledWith(expect.objectContaining({ deviceType: 'mobile' }));

    const desktop = await POST(mockRequest({ event: 'weather_view' }, { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) Firefox/126.0' }) as Postable);
    expect(desktop.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenLastCalledWith(expect.objectContaining({ deviceType: 'desktop' }));

    const tablet = await POST(mockRequest({ event: 'weather_view' }, { 'user-agent': 'Mozilla/5.0 (iPad; CPU OS 17_0)' }) as Postable);
    expect(tablet.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenLastCalledWith(expect.objectContaining({ deviceType: 'tablet' }));
  });

  it('guarda página de entrada y campaña UTM para atribución', async () => {
    const req = mockRequest({
      event: 'lead_form_success',
      page: '/huescar',
      entryPage: '/huescar/campo',
      utmCampaign: 'primavera-2026',
      metadata: { municipality: 'Huéscar', crop: 'Almendro', interest: 'Avisos de helada' },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        entryPage: '/huescar/campo',
        utmCampaign: 'primavera-2026',
        metadata: { municipality: 'Huéscar', crop: 'Almendro', interest: 'Avisos de helada' },
      }),
    );
  });

  it('accepts all allowlisted events', async () => {
    const events = [
      'weather_view', 'push_prompt_shown', 'push_subscribed',
      'lead_form_opened', 'lead_form_started', 'lead_form_submitted',
      'whatsapp_clicked', 'daily_card_shared',
    ];
    for (const event of events) {
      mockRecordBusinessEvent.mockResolvedValue(true);
      const req = mockRequest({ event });
      const res = await POST(req as Postable);
      expect(res.status).toBe(201);
    }
  });

  it('acepta métricas RUM (LCP, INP, CLS)', async () => {
    for (const event of ['web_vital_lcp', 'web_vital_inp', 'web_vital_cls']) {
      mockRecordBusinessEvent.mockResolvedValue(true);
      const req = mockRequest({ event, page: '/huescar/campo' });
      const res = await POST(req as Postable);
      expect(res.status).toBe(201);
    }
  });

  it('conserva dimensiones RUM: ruta, municipio, dispositivo y conexión', async () => {
    const req = mockRequest({
      event: 'web_vital_lcp',
      page: '/castril',
      metadata: {
        value: 1234.5,
        delta: 1234.5,
        rating: 'good',
        id: 'v3-123',
        navigationType: 'navigate',
        route: '/castril',
        municipality: 'castril',
        device_type: 'mobile',
        connection_type: '4g',
      },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    const metadata = mockRecordBusinessEvent.mock.calls[0][0].metadata as Record<string, unknown>;
    expect(metadata).toEqual(expect.objectContaining({
      value: 1234.5,
      rating: 'good',
      route: '/castril',
      municipality: 'castril',
      device_type: 'mobile',
      connection_type: '4g',
    }));
  });

  it('PRIVACIDAD: las métricas RUM no admiten claves arbitrarias', async () => {
    const req = mockRequest({
      event: 'web_vital_inp',
      metadata: { rating: 'good', user_id: 'abc', fingerprint: 'xyz' },
    });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    const metadata = mockRecordBusinessEvent.mock.calls[0][0].metadata as Record<string, unknown>;
    expect(metadata.rating).toBe('good');
    expect(metadata.user_id).toBeUndefined();
    expect(metadata.fingerprint).toBeUndefined();
  });

  it('extracts client IP from forwarded headers', async () => {
    const req = mockRequest({ event: 'weather_view' }, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    const res = await POST(req as Postable);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ ipHash: expect.any(String) }),
    );
  });
});
