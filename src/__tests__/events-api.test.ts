import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockInitializeDatabase, mockRecordBusinessEvent } = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockRecordBusinessEvent: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  recordBusinessEvent: mockRecordBusinessEvent,
}));

import { POST } from '@/app/api/events/route';

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
    mockRecordBusinessEvent.mockResolvedValue(true);
  });

  it('rejects empty event', async () => {
    const req = mockRequest({ event: '' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('rejects invalid event not in allowlist', async () => {
    mockRecordBusinessEvent.mockResolvedValue(false);
    const req = mockRequest({ event: 'invalid_event_name' });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('accepts valid event with page', async () => {
    const req = mockRequest({ event: 'weather_view', page: '/huescar' });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'weather_view', page: '/huescar' }),
    );
  });

  it('accepts valid event with metadata', async () => {
    const meta = { crop: 'Olivar', municipality: 'Huéscar' };
    const req = mockRequest({ event: 'lead_form_submitted', metadata: meta });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'lead_form_submitted', metadata: meta }),
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
      const res = await POST(req as any);
      expect(res.status).toBe(201);
    }
  });

  it('extracts client IP from forwarded headers', async () => {
    const req = mockRequest({ event: 'weather_view' }, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockRecordBusinessEvent).toHaveBeenCalledWith(
      expect.objectContaining({ ipHash: expect.any(String) }),
    );
  });
});
