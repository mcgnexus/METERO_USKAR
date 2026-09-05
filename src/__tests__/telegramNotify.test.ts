import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockInitializeDatabase, mockConsumeLeadAttempt, mockSaveAgriculturalLead, mockFindRecentLead } = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockConsumeLeadAttempt: vi.fn(),
  mockSaveAgriculturalLead: vi.fn(),
  mockFindRecentLead: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  consumeLeadAttempt: mockConsumeLeadAttempt,
  saveAgriculturalLead: mockSaveAgriculturalLead,
  findRecentLead: mockFindRecentLead,
}));

import { POST } from '@/app/api/leads/agricultural/route';

function mockRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request('http://localhost/api/leads/agricultural', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as unknown as Request & { nextUrl: URL };
}

const VALID_LEAD = {
  name: 'Juan Pérez',
  phone: '614242716',
  municipality: 'Huéscar',
  crop: 'Olivar',
  area: '5-20 ha',
  interests: ['Avisos de helada', 'Recomendaciones de riego'],
  meteorologicalConsent: true,
  commercialConsent: false,
  website: '',
};

describe('POST /api/leads/agricultural — lead saved + Telegram notified', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockConsumeLeadAttempt.mockResolvedValue(true);
    mockSaveAgriculturalLead.mockResolvedValue(true);
    mockFindRecentLead.mockResolvedValue(false);
    process.env = { ...originalEnv };
    process.env.TELEGRAM_NOTIFY_BOT_TOKEN = 'test-token-123';
    process.env.TELEGRAM_NOTIFY_CHAT_ID = '8039041331';
  });

  it('returns 201 and sends Telegram notification on successful lead', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { status: 200 }));

    const req = mockRequest(VALID_LEAD);
    const res = await POST(req as any);
    expect(res.status).toBe(201);

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bottest-token-123/sendMessage');
    const body = JSON.parse(opts.body as string);
    expect(body.chat_id).toBe('8039041331');
    expect(body.text).toContain('Juan Pérez');
    expect(body.text).toContain('Huéscar');
    expect(body.text).toContain('Olivar');
  });

  it('lead is saved even when Telegram notification fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));

    const req = mockRequest(VALID_LEAD);
    const res = await POST(req as any);

    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledTimes(1);
  });

  it('does not call Telegram when env vars are missing', async () => {
    delete process.env.TELEGRAM_NOTIFY_BOT_TOKEN;
    delete process.env.TELEGRAM_NOTIFY_CHAT_ID;
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const req = mockRequest(VALID_LEAD);
    const res = await POST(req as any);

    expect(res.status).toBe(201);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
