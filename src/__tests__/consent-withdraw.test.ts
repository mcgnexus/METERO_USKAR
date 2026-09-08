import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockInitializeDatabase, mockConsumeLeadAttempt, mockWithdrawLeadConsent } = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockConsumeLeadAttempt: vi.fn(),
  mockWithdrawLeadConsent: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  consumeLeadAttempt: mockConsumeLeadAttempt,
  withdrawLeadConsent: mockWithdrawLeadConsent,
}));

import { POST } from '@/app/api/leads/consent/route';

type Postable = Parameters<typeof POST>[0];

function mockRequest(body: unknown): Postable {
  return new Request('http://localhost/api/leads/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as Postable;
}

describe('POST /api/leads/consent — retirada de consentimiento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockConsumeLeadAttempt.mockResolvedValue(true);
    mockWithdrawLeadConsent.mockResolvedValue(true);
  });

  it('200: retira el consentimiento comercial de un teléfono normalizado', async () => {
    const res = await POST(mockRequest({ phone: '+34 614-242-716', purpose: 'commercial' }));
    expect(res.status).toBe(200);
    expect(mockWithdrawLeadConsent).toHaveBeenCalledWith('+34614242716', 'commercial');
  });

  it('200: permite retirar también los avisos de la finca (finalidades independientes)', async () => {
    const res = await POST(mockRequest({ phone: '614242716', purpose: 'service_alerts' }));
    expect(res.status).toBe(200);
    expect(mockWithdrawLeadConsent).toHaveBeenCalledWith('614242716', 'service_alerts');
  });

  it('200: respuesta idéntica aunque el teléfono no tenga leads (sin enumeración)', async () => {
    mockWithdrawLeadConsent.mockResolvedValue(false);
    const res = await POST(mockRequest({ phone: '600000000', purpose: 'commercial' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ ok: true });
  });

  it('400: teléfono inválido o finalidad desconocida', async () => {
    const bad = await POST(mockRequest({ phone: 'no', purpose: 'commercial' }));
    expect(bad.status).toBe(400);
    const badPurpose = await POST(mockRequest({ phone: '614242716', purpose: 'spam' }));
    expect(badPurpose.status).toBe(400);
    expect(mockWithdrawLeadConsent).not.toHaveBeenCalled();
  });

  it('429: límite de retiradas por IP', async () => {
    mockConsumeLeadAttempt.mockResolvedValue(false);
    const res = await POST(mockRequest({ phone: '614242716', purpose: 'commercial' }));
    expect(res.status).toBe(429);
    // El límite usa su propia ventana, independiente de la de envío de leads
    const bucket = mockConsumeLeadAttempt.mock.calls[0]?.[0] as string | undefined;
    expect(bucket).toMatch(/^withdraw:/);
  });
});
