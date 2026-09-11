import { describe, it, expect } from 'vitest';
import {
  resolveFreshness,
  describeAge,
  nextRefreshLabel,
  formatLastReceived,
  apiStatusMessage,
  FRESHNESS_THRESHOLDS_MINUTES,
} from '@/lib/freshness';

const NOW = Date.parse('2026-09-11T12:00:00.000Z');
const min = (n: number) => new Date(NOW - n * 60000).toISOString();

describe('umbrales por variable', () => {
  it('temperatura, lluvia y humedad del suelo NO comparten umbral', () => {
    const t = FRESHNESS_THRESHOLDS_MINUTES;
    expect(t.temperatura.freshMinutes).not.toBe(t.lluvia.freshMinutes);
    expect(t.lluvia.freshMinutes).not.toBe(t.humedad_suelo.freshMinutes);
    expect(t.temperatura.degradedMinutes).not.toBe(t.humedad_suelo.degradedMinutes);
  });
});

describe('tres estados de antigüedad', () => {
  it('temperatura: fresco / degradado / obsoleto', () => {
    expect(resolveFreshness('temperatura', min(30), NOW).level).toBe('fresco');
    expect(resolveFreshness('temperatura', min(120), NOW).level).toBe('degradado');
    expect(resolveFreshness('temperatura', min(200), NOW).level).toBe('obsoleto');
  });

  it('lluvia caduca antes que la humedad del suelo con la misma antigüedad', () => {
    const at = min(100);
    expect(resolveFreshness('lluvia', at, NOW).level).toBe('obsoleto');
    expect(resolveFreshness('humedad_suelo', at, NOW).level).toBe('fresco');
  });

  it('sin fecha o fecha inválida → obsoleto', () => {
    expect(resolveFreshness('prevision', null, NOW).level).toBe('obsoleto');
    expect(resolveFreshness('prevision', 'no-es-fecha', NOW).level).toBe('obsoleto');
    expect(resolveFreshness('prevision', undefined, NOW).level).toBe('obsoleto');
  });
});

describe('previsión cacheada no aparece como observación', () => {
  it('la etiqueta de frescura es independiente del origen y usa umbral de previsión', () => {
    // dato de hace 240 min: obsoleto como temperatura, aún degradado como previsión
    const at = min(240);
    expect(resolveFreshness('temperatura', at, NOW).level).toBe('obsoleto');
    expect(resolveFreshness('prevision', at, NOW).level).toBe('degradado');
  });
});

describe('línea de trazabilidad', () => {
  it('describeAge en minutos, horas y días', () => {
    expect(describeAge(0.5)).toBe('hace menos de 1 min');
    expect(describeAge(12)).toBe('hace 12 min');
    expect(describeAge(90)).toBe('hace 2 h');
    expect(describeAge(3000)).toBe('hace 2 días');
    expect(describeAge(Infinity)).toBe('antigüedad desconocida');
  });

  it('nextRefreshLabel usa el intervalo de la variable', () => {
    expect(nextRefreshLabel('lluvia', min(10))).toMatch(/próxima actualización ≈ \d{2}:\d{2}/);
    expect(nextRefreshLabel('lluvia', null)).toContain('sin fecha');
  });
});

describe('sensor caído: último valor recibido', () => {
  it('conserva valor + fecha y nunca lo presenta como actual', () => {
    const text = formatLastReceived({ value: '21,4 °C', receivedAt: min(90), nowMs: NOW });
    expect(text).toContain('21,4 °C');
    expect(text).toContain('último valor recibido');
    expect(text).toContain('hace 2 h');
  });

  it('sin fecha de recepción devuelve null (no se inventa frescura)', () => {
    expect(formatLastReceived({ value: '21,4 °C', receivedAt: null })).toBeNull();
  });
});

describe('estado de API accionable', () => {
  it('error con datos previos → mensaje de reintento conservando datos', () => {
    const msg = apiStatusMessage({ loading: false, error: new Error('x'), hasData: true, attempts: 2 });
    expect(msg).toContain('últimos datos disponibles');
    expect(msg).toContain('Reintentar');
  });

  it('error sin datos y sin reintentos posibles → mensaje claro, sin skeleton infinito', () => {
    const msg = apiStatusMessage({ loading: false, error: new Error('x'), hasData: false, attempts: 2 });
    expect(msg).toContain('no responde');
  });

  it('carga normal no produce mensaje', () => {
    expect(apiStatusMessage({ loading: true, error: null, hasData: false, attempts: 0 })).toBeNull();
  });
});
