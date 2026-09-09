import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFunnelMetrics } from '@/lib/weatherStore';

type DbRow = Record<string, unknown>;

function makePool(handlers: Array<{ test: (text: string) => boolean; rows: DbRow[] }>) {
  return vi.fn(async (text: string) => {
    for (const h of handlers) {
      if (h.test(text)) return { rows: h.rows };
    }
    throw new Error('Unexpected query: ' + text);
  });
}

vi.mock('@neondatabase/serverless', () => {
  let pool: ReturnType<typeof makePool> | null = null;
  return {
    Pool: class {
      constructor() {}
      query(this: unknown, text: string) {
        if (!pool) throw new Error('pool not configured');
        return pool(text);
      }
    },
    __setPool: (p: ReturnType<typeof makePool>) => { pool = p; },
  };
});

describe('getFunnelMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('unifica eventos canónicos y legacy, cruza con leads y calcula tasas', async () => {
    const eventRows: DbRow[] = [
      { event_name: 'weather_view', municipality: 'Huéscar', campaign: 'regadio-2026', total: 100 },
      { event_name: 'lead_cta_click', municipality: 'Huéscar', campaign: 'regadio-2026', total: 30 },
      { event_name: 'lead_form_start', municipality: 'Huéscar', campaign: 'regadio-2026', total: 10 },
      { event_name: 'lead_form_submit', municipality: 'Huéscar', campaign: 'regadio-2026', total: 6 },
      { event_name: 'lead_form_success', municipality: 'Huéscar', campaign: 'regadio-2026', total: 4 },
      { event_name: 'whatsapp_click', municipality: 'Huéscar', campaign: 'regadio-2026', total: 3 },
      { event_name: 'lead_responded', municipality: 'Huéscar', campaign: 'regadio-2026', total: 1 },
    ];
    const handlers: Array<{ test: (text: string) => boolean; rows: DbRow[] }> = [
      { test: (t) => t.includes('FROM business_events'), rows: eventRows },
      { test: (t) => t.includes('COUNT(*)::int') && t.includes('FROM agricultural_leads'), rows: [{ total: 5 }] },
      { test: (t) => t.includes('DISTINCT municipality'), rows: [{ municipality: 'Huéscar' }] },
      { test: (t) => t.includes('DISTINCT utm_campaign'), rows: [{ utm_campaign: 'regadio-2026' }] },
    ];
    const { __setPool } = await import('@neondatabase/serverless' as string) as any;
    __setPool(makePool(handlers));

    const report = await getFunnelMetrics({ daysBack: 30 });

    expect(report.hasData).toBe(true);
    const byKey = Object.fromEntries(report.steps.map((s) => [s.key, s]));
    expect(byKey.visits.count).toBe(100);
    expect(byKey.cta.count).toBe(30);
    expect(byKey.form_started.count).toBe(10);
    expect(byKey.form_completed.count).toBe(6);
    expect(byKey.lead_valid.count).toBe(5); // max(eventos 4, leads guardados 5)
    expect(byKey.whatsapp.count).toBe(3);
    expect(byKey.responded.count).toBe(1);
    expect(byKey.cta.conversionPct).toBeCloseTo(30, 0);
    expect(byKey.form_started.conversionPct).toBeCloseTo(33.33, 0);
    expect(byKey.form_completed.conversionPct).toBeCloseTo(60, 0);
    expect(byKey.lead_valid.conversionPct).toBeCloseTo(83.33, 0);
    expect(byKey.whatsapp.conversionPct).toBeCloseTo(60, 0);
    expect(byKey.responded.conversionPct).toBeCloseTo(33.33, 0);
    expect(report.municipalities).toEqual(['Huéscar']);
    expect(report.campaigns).toEqual(['regadio-2026']);
  });

  it('aplica el filtro por municipio y campaña al decrementar el embudo', async () => {
    const eventRows: DbRow[] = [
      { event_name: 'weather_view', municipality: 'Huéscar', campaign: 'regadio-2026', total: 80 },
      { event_name: 'weather_view', municipality: 'Castril', campaign: 'otra-campana', total: 40 },
      { event_name: 'lead_cta_click', municipality: 'Huéscar', campaign: 'regadio-2026', total: 20 },
      { event_name: 'lead_form_started', municipality: 'Castril', campaign: 'otra-campana', total: 5 },
    ];
    const handlers: Array<{ test: (text: string) => boolean; rows: DbRow[] }> = [
      { test: (t) => t.includes('FROM business_events'), rows: eventRows },
      { test: (t) => t.includes('COUNT(*)::int') && t.includes('FROM agricultural_leads'), rows: [{ total: 12 }] },
    ];
    const { __setPool } = await import('@neondatabase/serverless' as string) as any;
    __setPool(makePool(handlers));

    const report = await getFunnelMetrics({ daysBack: 30, municipality: 'Huéscar', utmCampaign: 'regadio-2026' });

    const byKey = Object.fromEntries(report.steps.map((s) => [s.key, s]));
    expect(byKey.visits.count).toBe(80);
    expect(byKey.cta.count).toBe(20);
    expect(byKey.form_started.count).toBe(0);
    expect(report.hasData).toBe(true);
  });

  it('devuelve hasData false y pasos vacíos sin eventos ni leads', async () => {
    const handlers: Array<{ test: (text: string) => boolean; rows: DbRow[] }> = [
      { test: () => true, rows: [] },
    ];
    const { __setPool } = await import('@neondatabase/serverless' as string) as any;
    __setPool(makePool(handlers));

    const report = await getFunnelMetrics({ daysBack: 7 });

    expect(report.hasData).toBe(false);
    expect(report.steps.every((s) => s.count === 0)).toBe(true);
    expect(report.steps.every((s) => s.conversionPct === 0)).toBe(true);
  });
});