import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockInitializeDatabase, mockConsumeLeadAttempt, mockSaveAgriculturalLead } = vi.hoisted(() => ({
  mockInitializeDatabase: vi.fn(),
  mockConsumeLeadAttempt: vi.fn(),
  mockSaveAgriculturalLead: vi.fn(),
}));

vi.mock('@/lib/weatherStore', () => ({
  initializeDatabase: mockInitializeDatabase,
  consumeLeadAttempt: mockConsumeLeadAttempt,
  saveAgriculturalLead: mockSaveAgriculturalLead,
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

describe('POST /api/leads/agricultural with source fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockConsumeLeadAttempt.mockResolvedValue(true);
    mockSaveAgriculturalLead.mockResolvedValue(true);
  });

  it('saves source and landing_page when provided', async () => {
    const req = mockRequest({ ...VALID_LEAD, source: 'meteo-huescar', landingPage: '/huescar' });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'meteo-huescar', landingPage: '/huescar' }),
    );
  });

  it('saves UTM parameters when provided', async () => {
    const req = mockRequest({
      ...VALID_LEAD,
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'spring-2026',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ utmSource: 'google', utmMedium: 'cpc', utmCampaign: 'spring-2026' }),
    );
  });

  it('defaults source to direct when not provided', async () => {
    const req = mockRequest(VALID_LEAD);
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'direct', landingPage: '/' }),
    );
  });

  it('truncates source to 40 chars', async () => {
    const req = mockRequest({ ...VALID_LEAD, source: 'a'.repeat(60) });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'a'.repeat(40) }),
    );
  });

  it('truncates UTM values to 100 chars', async () => {
    const req = mockRequest({ ...VALID_LEAD, utmSource: 'b'.repeat(150) });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockSaveAgriculturalLead).toHaveBeenCalledWith(
      expect.objectContaining({ utmSource: 'b'.repeat(100) }),
    );
  });
});
