import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockFindLeadsPendingNotification, mockSetLeadNotificationStatus, mockInitializeDatabase, mockNotifyNewLead } =
  vi.hoisted(() => ({
    mockFindLeadsPendingNotification: vi.fn(),
    mockSetLeadNotificationStatus: vi.fn(),
    mockInitializeDatabase: vi.fn(),
    mockNotifyNewLead: vi.fn(),
  }));

vi.mock('@/lib/weatherStore', () => ({
  findLeadsPendingNotification: mockFindLeadsPendingNotification,
  setLeadNotificationStatus: mockSetLeadNotificationStatus,
  initializeDatabase: mockInitializeDatabase,
}));

vi.mock('@/services/telegramNotify', () => ({
  notifyNewLead: mockNotifyNewLead,
}));

import { GET } from '@/app/api/cron/retry-lead-notifications/route';

type Gettable = Parameters<typeof GET>[0];

function mockRequest(auth?: string): Gettable {
  return new Request('http://localhost/api/cron/retry-lead-notifications', {
    method: 'GET',
    headers: auth ? { Authorization: auth } : {},
  }) as Gettable;
}

const PENDING_LEAD = {
  id: 42,
  name: 'Ana',
  phone: '600111222',
  municipality: 'Huéscar',
  crop: 'Almendro',
  area: '5-20 ha',
  interests: ['Heladas'],
  attempts: 1,
};

describe('GET /api/cron/retry-lead-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret-1234567890';
    mockInitializeDatabase.mockResolvedValue(undefined);
    mockSetLeadNotificationStatus.mockResolvedValue(undefined);
    mockNotifyNewLead.mockResolvedValue(true);
  });

  it('401 sin autorización', async () => {
    const res = await GET(mockRequest());
    expect(res.status).toBe(401);
  });

  it('reintenta leads fallidos y marca notified al tener éxito', async () => {
    mockFindLeadsPendingNotification.mockResolvedValue([PENDING_LEAD]);
    const res = await GET(mockRequest('Bearer test-secret-1234567890'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.notified).toBe(1);
    expect(json.failed).toBe(0);
    expect(mockNotifyNewLead).toHaveBeenCalledWith(expect.objectContaining({ leadId: 42 }));
    expect(mockSetLeadNotificationStatus).toHaveBeenCalledWith(42, 'notified');
  });

  it('si Telegram vuelve a fallar, el lead se conserva con notification_failed', async () => {
    mockFindLeadsPendingNotification.mockResolvedValue([PENDING_LEAD]);
    mockNotifyNewLead.mockResolvedValue(false);
    const res = await GET(mockRequest('Bearer test-secret-1234567890'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.failed).toBe(1);
    expect(mockSetLeadNotificationStatus).toHaveBeenCalledWith(42, 'notification_failed');
  });
});
