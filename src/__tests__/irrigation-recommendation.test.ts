import { describe, it, expect } from 'vitest';
import {
  buildIrrigationRecommendation,
  computeNetIrrigationNeedMm,
  mmToLitersPerM2,
  litersPerM2ToMm,
  totalVolumeLiters,
  formatTotalVolume,
} from '@/lib/irrigation-recommendation';

const baseFull = {
  crop: 'olivo',
  kc: 0.7,
  irrigationSystem: 'goteo',
  soilMoisturePct: 15,
  soilMoistureObservedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  soilMoistureThresholdPct: 25,
  et0Mm: 35,
  effectiveRainMm: 5,
  areaM2: 10000,
  soilType: 'limoso',
  horizonDays: 7,
  computedAt: '2026-09-11T08:00:00.000Z',
};

describe('unidades y redondeo', () => {
  it('1 mm = 1 L/m²', () => {
    expect(mmToLitersPerM2(1)).toBe(1);
    expect(litersPerM2ToMm(45.8)).toBeCloseTo(45.8, 6);
  });

  it('el volumen total es coherente con mm × superficie', () => {
    expect(totalVolumeLiters(72, 10000)).toBe(720000);
    const v = formatTotalVolume(totalVolumeLiters(10, 5000));
    expect(v.liters).toBe(50000);
    expect(v.cubicMeters).toBeCloseTo(50, 2);
  });

  it('el rango en mm y L/m² coincide', () => {
    const rec = buildIrrigationRecommendation(baseFull);
    expect(rec.amount.rangeMm).toEqual(rec.amount.rangeLitersPerM2);
    if (rec.amount.rangeMm) {
      expect(rec.amount.rangeMm.min).toBeLessThan(rec.amount.mm!);
      expect(rec.amount.rangeMm.max).toBeGreaterThan(rec.amount.mm!);
    }
  });
});

describe('cálculo ETc', () => {
  it('descuenta lluvia efectiva y aplica eficiencia', () => {
    // ETc = 35 * 0.7 = 24.5; neto = 24.5 - 5 = 19.5; /0.9 = 21.7
    expect(computeNetIrrigationNeedMm({ et0Mm: 35, kc: 0.7, effectiveRainMm: 5, irrigationEfficiency: 0.9 })).toBe(21.7);
  });

  it('lluvia suficiente → necesidad 0', () => {
    expect(computeNetIrrigationNeedMm({ et0Mm: 10, kc: 0.7, effectiveRainMm: 30 })).toBe(0);
  });
});

describe('casos conocidos', () => {
  it('lluvia suficiente → no se recomienda riego extra', () => {
    const rec = buildIrrigationRecommendation({ ...baseFull, et0Mm: 10, effectiveRainMm: 30 });
    expect(rec.amount.mm).toBe(0);
    expect(rec.action).toContain('No se necesita riego extra');
  });

  it('ola de calor (ET0 alta) → rango alto y confianza no baja por cálculo', () => {
    const rec = buildIrrigationRecommendation({ ...baseFull, et0Mm: 70 });
    expect(rec.amount.mm).toBeGreaterThan(40);
    expect(rec.action).toMatch(/Aporta \d+(\.\d+)?–\d+(\.\d+)? mm entre las 21:00 y las 06:00/);
  });

  it('sensor sin datos → necesidad teórica, confianza rebajada y advertencia', () => {
    const rec = buildIrrigationRecommendation({ ...baseFull, soilMoisturePct: null, soilMoistureObservedAt: null });
    expect(rec.nature).toBe('necesidad_teorica');
    expect(rec.confidence).not.toBe('alta');
    expect(rec.warning).toContain('sensor');
    expect(rec.condition).toContain('confirma con tacto');
  });

  it('dato de humedad antiguo se trata como no disponible', () => {
    const rec = buildIrrigationRecommendation({
      ...baseFull,
      soilMoistureObservedAt: new Date(Date.now() - 200 * 3600 * 1000).toISOString(),
    });
    expect(rec.nature).toBe('necesidad_teorica');
    expect(rec.missingParams).toContain('humedad del suelo reciente');
  });

  it('sin cultivo ni Kc → no hay recomendación universal', () => {
    const rec = buildIrrigationRecommendation({ et0Mm: 35, computedAt: '2026-09-11T08:00:00.000Z' });
    expect(rec.amount.mm).toBeNull();
    expect(rec.action).toContain('No se emite recomendación');
    expect(rec.missingParams).toContain('cultivo');
    expect(rec.confidence).toBe('baja');
  });

  it('cambio de cultivo cambia ETc y la dosis', () => {
    const olivo = buildIrrigationRecommendation({ ...baseFull, kc: 0.7 });
    const tomate = buildIrrigationRecommendation({ ...baseFull, crop: 'tomate', kc: 0.85 });
    expect(tomate.amount.mm!).toBeGreaterThan(olivo.amount.mm!);
  });
});

describe('contexto obligatorio', () => {
  it('siempre incluye fecha de cálculo, horizonte, parámetros y confianza', () => {
    const rec = buildIrrigationRecommendation(baseFull);
    expect(rec.computedAt).toBeTruthy();
    expect(rec.horizonDays).toBe(7);
    expect(rec.dataUsed.length).toBeGreaterThan(0);
    expect(['alta', 'media', 'baja']).toContain(rec.confidence);
    expect(rec.dataUsed.find((p) => p.label === 'Kc')?.value).toBe('0.70');
  });

  it('parámetros ausentes se muestran como no disponible y rebajan confianza', () => {
    const rec = buildIrrigationRecommendation({ ...baseFull, irrigationSystem: null, soilType: null });
    expect(rec.dataUsed.find((p) => p.label === 'Sistema de riego')?.value).toBe('no disponible');
    expect(rec.confidence).toBe('media');
  });
});
