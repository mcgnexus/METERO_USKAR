import { describe, it, expect } from 'vitest';
import { compactHuescarHomeResponse } from '@/services/huescarWeatherService';
import { buildHuescarResponse, NOW_ISO } from './fixtures/huescarResponse';
import type { HuescarWeatherResponse } from '@/types/weather-response';

describe('compactHuescarHomeResponse', () => {
  it('conserva diario, agrícola y avisos y soporta weather sin series horarias', () => {
    const resp = buildHuescarResponse();
    const c = compactHuescarHomeResponse(resp);

    expect(c.daily).toEqual(resp.daily);
    expect(c.weather?.agricultural?.frostRisk48h).toBe(resp.weather?.agricultural?.frostRisk48h);
    expect(c.alerts).toEqual(resp.alerts);
  });

  it('recorta response.hourly a horas a partir de "ahora" (máximo 24)', () => {
    const resp = buildHuescarResponse();
    const c = compactHuescarHomeResponse(resp);
    const nowMs = new Date(NOW_ISO).getTime();

    expect(c.hourly.length).toBeGreaterThan(0);
    expect(c.hourly.length).toBeLessThanOrEqual(24);
    expect(c.hourly.every((h) => new Date(h.time).getTime() >= nowMs)).toBe(true);
  });

  it('recorta las series de weather.hourly a una ventana de 24 h que incluye "ahora"', () => {
    const resp = buildHuescarResponse();
    const nowMs = new Date(NOW_ISO).getTime();
    const times = Array.from(
      { length: 48 },
      (_, i) => new Date(nowMs - 12 * 3_600_000 + i * 3_600_000).toISOString(),
    );
    const weather = resp.weather as HuescarWeatherResponse['weather'] & {
      hourly: { time: string[]; temperatureC: number[]; humidityPct: number[]; precipitationProbabilityPct: number[]; precipitationMm: number[]; weatherCode: number[]; windSpeedKmh: number[] };
      comparisonHourly: { aemet: { time: string[]; temperatureC: number[] } | null; openMeteo: { time: string[]; temperatureC: number[] } | null };
    };
    weather.hourly = {
      time: times,
      temperatureC: times.map((_, i) => i),
      humidityPct: times.map((_, i) => 50 + i),
      precipitationProbabilityPct: times.map((_, i) => i * 2),
      precipitationMm: times.map((_, i) => i / 10),
      weatherCode: times.map(() => 1),
      windSpeedKmh: times.map(() => 8),
    };
    weather.comparisonHourly = {
      aemet: { time: times, temperatureC: [1, 2] },
      openMeteo: { time: times, temperatureC: [1, 2] },
    };

    const c = compactHuescarHomeResponse(resp) as typeof resp & {
      weather: typeof weather;
    };
    expect(c.weather.hourly.time.length).toBeLessThanOrEqual(24);
    const ms = c.weather.hourly.time.map((t) => new Date(t).getTime());
    expect(Math.min(...ms)).toBeLessThanOrEqual(nowMs);
    expect(Math.max(...ms)).toBeGreaterThanOrEqual(nowMs);
    expect(c.weather.comparisonHourly).toEqual({ aemet: null, openMeteo: null });
  });
});