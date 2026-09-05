import { describe, it, expect } from 'vitest';
import { buildWeeklyNewsletter } from '@/services/weeklyNewsletter';
import type { WeatherPayload, PulseAlarm } from '@/types/weather';
import type { AgroClimatologyPayload } from '@/services/agroClimatologyService';

const BASE_WEATHER = {
  location: 'Huescar',
  latitude: 37.8094,
  longitude: -2.5392,
  elevation: 953,
  timezone: 'Europe/Madrid',
  source: 'FUSED',
  fetchedAt: '2026-09-05T12:00:00Z',
  confidencePct: 85,
  confidenceExplanation: '',
  dataQuality: {} as any,
  current: {} as any,
  sources: [],
  sourceHealth: [],
  hourly: { temperatureC: [], humidityPct: [] } as any,
  comparisonHourly: {} as any,
  daily: {
    time: ['2026-09-06', '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'],
    temperatureMinC: [8, 7, 6, 9, 10, 8, 7],
    temperatureMaxC: [22, 24, 21, 23, 25, 22, 20],
    precipitationProbabilityPct: [10, 20, 60, 80, 40, 10, 5],
    precipitationSumMm: [0, 0.2, 3.5, 8.1, 2.0, 0, 0],
    windGustKmh: [20, 25, 30, 35, 20, 15, 10],
    et0Mm: [3.5, 4.0, 3.2, 3.8, 4.5, 3.5, 3.0],
    weatherCode: [0, 1, 61, 63, 61, 0, 0],
  } as any,
  alerts: [],
  agricultural: {
    et0CumulativeMm: 25.5,
    gddCumulative: 85.0,
    chillHours: 0,
    frostRisk48h: 'none',
    workability: { workable: true, reasons: [] },
    recommendedIrrigationLitersM2: 0,
    pestRisk: { repiloRisk: 'medio', oliveFlyRisk: 'bajo' },
  },
} as unknown as WeatherPayload;

const BASE_AGRO = {
  frost: { lastFrostDate: '2026-04-15', daysSinceLastFrost: 143, frostFreeDays: 143, totalFrostNightsThisSeason: 3 },
  chill: { chillHoursAccumulated: 520, chillPortionsAccumulated: 42, seasonStart: '2025-11-01', chillTarget: 700, chillProgressPct: 74 },
  waterBalance: { precipitationMmThisMonth: 12, precipitationMmThisYear: 180, precipitationMmThisSeason: 95, et0MmThisMonth: 45, et0MmThisSeason: 320, deficitMmThisMonth: -33, deficitMmThisSeason: 225, monthLabel: 'septiembre', seasonStart: '2025-09-01' },
} as unknown as AgroClimatologyPayload;

describe('buildWeeklyNewsletter', () => {
  it('includes week range header', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], null);
    expect(text).toContain('Bolet\u00EDn del Campo');
    expect(text).toContain('semana del');
  });

  it('includes temperature range', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], null);
    expect(text).toContain('6\u00B0C m\u00EDn');
    expect(text).toContain('25\u00B0C m\u00E1x');
  });

  it('includes irrigation recommendation', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], null);
    expect(text).toContain('Riego');
  });

  it('includes GDD', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], null);
    expect(text).toContain('85 GDD');
  });

  it('includes agro-climatology water balance when available', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], BASE_AGRO);
    expect(text).toContain('Balance h');
    expect(text).toContain('520 h');
  });

  it('includes critical alarms when present', () => {
    const alarms: PulseAlarm[] = [
      { level: 'critico', audience: 'Agricultura', title: 'Alerta helada', message: 'Temperaturas bajo -4\u00B0C', source: 'modelo' },
    ];
    const text = buildWeeklyNewsletter(BASE_WEATHER, alarms, null);
    expect(text).toContain('ALERTAS ACTIVAS');
    expect(text).toContain('Alerta helada');
  });

  it('includes detail link and signature', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], null);
    expect(text).toContain('meteo.tecrural.es/huescar/campo');
    expect(text).toContain('TecRural');
    expect(text).toContain('614 24 27 16');
  });

  it('shows frost risk when not none', () => {
    const weather = {
      ...BASE_WEATHER,
      agricultural: { ...BASE_WEATHER.agricultural, frostRisk48h: 'alta' },
    } as unknown as WeatherPayload;
    const text = buildWeeklyNewsletter(weather, [], null);
    expect(text).toContain('ALTO');
  });

  it('shows pest risk when not bajo', () => {
    const text = buildWeeklyNewsletter(BASE_WEATHER, [], null);
    expect(text).toContain('Plagas');
    expect(text).toContain('repilo: medio');
  });
});
