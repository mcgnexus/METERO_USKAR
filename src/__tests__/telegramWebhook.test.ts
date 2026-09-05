import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockSendTelegramMessage, mockGetRecentLeads } = vi.hoisted(() => ({
  mockSendTelegramMessage: vi.fn(),
  mockGetRecentLeads: vi.fn(),
}));

vi.mock('@/services/telegramNotify', () => ({
  sendTelegramMessage: mockSendTelegramMessage,
}));

vi.mock('@/lib/weatherStore', () => ({
  getRecentLeads: mockGetRecentLeads,
}));

import { POST } from '@/app/api/telegram/webhook/route';
import type { NextRequest } from 'next/server';

function mockUpdate(body: unknown, secret?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) headers['x-telegram-bot-api-secret-token'] = secret;
  return new Request('http://localhost/api/telegram/webhook', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }) as NextRequest;
}

const OWNER_CHAT = 8039041331;

describe('POST /api/telegram/webhook', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.TELEGRAM_NOTIFY_BOT_TOKEN = 'test-token-123';
    process.env.TELEGRAM_NOTIFY_CHAT_ID = String(OWNER_CHAT);
    mockSendTelegramMessage.mockResolvedValue(true);
    mockGetRecentLeads.mockResolvedValue([]);
  });

  it('rejects when the secret token does not match', async () => {
    const res = await POST(mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: '/leads' } }, 'wrong-secret'));
    expect(res.status).toBe(403);
    expect(mockSendTelegramMessage).not.toHaveBeenCalled();
  });

  it('ignores updates when secret token is absent', async () => {
    const res = await POST(mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: '/leads' } }));
    expect(res.status).toBe(403);
    expect(mockSendTelegramMessage).not.toHaveBeenCalled();
  });

  it('answers /leads with recent leads to the owner', async () => {
    mockGetRecentLeads.mockResolvedValue([
      {
        name: 'Juan Pérez',
        phone: '614242716',
        municipality: 'Huéscar',
        crop: 'Olivar',
        area: '5-20 ha',
        interests: ['Avisos de helada'],
        source: 'meteo-huescar',
        createdAt: '2026-09-05T10:00:00.000Z',
      },
    ]);

    const res = await POST(
      mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: '/leads' } }, 'test-token-123'),
    );
    expect(res.status).toBe(200);
    expect(mockGetRecentLeads).toHaveBeenCalledWith(5);
    expect(mockSendTelegramMessage).toHaveBeenCalledTimes(1);
    const sent = mockSendTelegramMessage.mock.calls[0][0] as string;
    expect(sent).toContain('Juan Pérez');
    expect(sent).toContain('614242716');
    expect(sent).toContain('Huéscar');
    expect(sent).toContain('Olivar');
  });

  it('ignores /leads from a chat that is not the owner', async () => {
    const res = await POST(
      mockUpdate({ message: { chat: { id: 12345 }, text: '/leads' } }, 'test-token-123'),
    );
    expect(res.status).toBe(200);
    expect(mockGetRecentLeads).not.toHaveBeenCalled();
    expect(mockSendTelegramMessage).not.toHaveBeenCalled();
  });

  it('replies that there are no leads yet when the database is empty', async () => {
    const res = await POST(
      mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: '/leads' } }, 'test-token-123'),
    );
    expect(res.status).toBe(200);
    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('No hay leads'),
    );
  });

  it('supports /leads N with a custom limit capped at 15', async () => {
    mockGetRecentLeads.mockResolvedValue([]);
    await POST(
      mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: '/leads 42' } }, 'test-token-123'),
    );
    expect(mockGetRecentLeads).toHaveBeenCalledWith(15);
  });

  it('responds to /ayuda with the list of commands', async () => {
    await POST(
      mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: '/ayuda' } }, 'test-token-123'),
    );
    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('/leads'),
    );
  });

  it('acknowledges unknown messages as ok', async () => {
    const res = await POST(
      mockUpdate({ message: { chat: { id: OWNER_CHAT }, text: 'hola' } }, 'test-token-123'),
    );
    expect(res.status).toBe(200);
    expect(mockSendTelegramMessage).toHaveBeenCalledWith(
      expect.stringContaining('no reconocido'),
    );
  });
});