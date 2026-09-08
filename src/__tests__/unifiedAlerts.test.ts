import { describe, it, expect } from 'vitest';
import {
  alarmToUnified,
  buildAgriculturalRecommendations,
  countByType,
  raifAlertToUnified,
  raifLevel,
  recommendedAction,
  weatherAlertToUnified,
} from '@/lib/unifiedAlerts';
import type { PulseAlarm } from '@/components/llano/alarms-logic';
import type { RaifAlert } from '@/types/raif';
import type { WeatherAlert } from '@/types/weather';
import type { HuescarWeatherResponse } from '@/types/weather-response';

const GENERATED_AT = '2026-09-08T10:00:00Z';

function responseFixture(agri: Record<string, unknown> | null): HuescarWeatherResponse {
  return {
    schemaVersion: 1,
    municipality: 'Huéscar',
    location: { name: 'Huéscar', lat: 37.75, lon: -2.53, elevation: 960 },
    timezone: 'Europe/Madrid',
    generatedAt: GENERATED_AT,
    model: 'ecmwf',
    current: {
      time: GENERATED_AT,
      temperatureC: 20,
      apparentTemperatureC: 20,
      humidityPct: 50,
      windSpeedKmh: 10,
      windGustKmh: 15,
      precipitationMm: 0,
      weatherCode: 0,
      dewPointC: 9,
      sourceName: 'test',
    },
    hourly: [],
    daily: [],
    alerts: [],
    sources: [],
    updatedAtLabel: '08/09/2026 12:00',
    climate: null,
    weather: agri ? ({ agricultural: agri } as unknown as HuescarWeatherResponse['weather']) : null,
    forecast: null,
  } as unknown as HuescarWeatherResponse;
}

const raifFixture = (overrides: Partial<RaifAlert> = {}): RaifAlert => ({
  id: 'raif-1',
  titulo: 'Aviso por Helicoverpa armigera',
  cultivo: 'Olivar',
  zona: 'Altiplano',
  provincia: 'Granada',
  plaga: 'Helicoverpa armigera',
  severidad: 'alta',
  tipo: 'accionable',
  estado: 'active',
  resumen: 'Vuelo intenso detectado en la zona.',
  medidas: ['Monitorizar capturas', 'Tratar solo sobre umbral'],
  validaDesde: '2026-09-01T00:00:00Z',
  validaHasta: '2026-09-15T00:00:00Z',
  fuenteUrl: 'https://www.juntadeandalucia.es/raif',
  creado: '2026-09-01T08:00:00Z',
  ...overrides,
});

describe('Clasificación unificada de alertas', () => {
  it('alarma del motor → tipo weather con fuente, nivel, fecha y acción', () => {
    const alarm: PulseAlarm = {
      level: 'critico',
      audience: 'Agricultura',
      title: 'Alerta de helada negra',
      message: 'Daño celular inminente.',
      source: 'modelo',
    };
    const unified = alarmToUnified(alarm, 0, GENERATED_AT);
    expect(unified.type).toBe('weather');
    expect(unified.source).toBe('Motor climático TecRural');
    expect(unified.level).toBe('critico');
    expect(unified.date).toBe(GENERATED_AT);
    expect(unified.action).toContain('medidas de protección');
  });

  it('feed AEMET → weather con nivel mapeado (severo→critico)', () => {
    const feed: WeatherAlert = { type: 'lluvia', level: 'severo', title: 'Lluvia intensa', message: '45 mm/h', source: 'aemet' };
    const unified = weatherAlertToUnified(feed, 0, GENERATED_AT);
    expect(unified.type).toBe('weather');
    expect(unified.source).toBe('AEMET (oficial)');
    expect(unified.level).toBe('critico');
    expect(unified.action).toBeTruthy();
  });

  it('aviso RAIF → tipo phytosanitary, acción = medidas oficiales', () => {
    const unified = raifAlertToUnified(raifFixture(), 0);
    expect(unified.type).toBe('phytosanitary');
    expect(unified.source).toContain('RAIF');
    expect(unified.level).toBe('critico'); // severidad alta accionable
    expect(unified.date).toBe('2026-09-01T00:00:00Z');
    expect(unified.action).toContain('Monitorizar capturas');
    expect(unified.url).toContain('juntadeandalucia');
  });

  it('RAIF informativa o severidad baja → nivel info', () => {
    expect(raifLevel(raifFixture({ tipo: 'informativa', severidad: 'alta' }))).toBe('info');
    expect(raifLevel(raifFixture({ severidad: 'baja' }))).toBe('info');
    expect(raifLevel(raifFixture({ severidad: 'media' }))).toBe('aviso');
  });

  it('recomendaciones agrícolas: riego, labores y plagas tipo propio (NO fitosanitario oficial)', () => {
    const recos = buildAgriculturalRecommendations(
      responseFixture({
        et0CumulativeMm: 4.2,
        recommendedIrrigationLitersM2: 30,
        workability: { workable: false, reasons: ['suelo encharcado'] },
        pestRisk: { repiloRisk: 'alto', oliveFlyRisk: 'bajo' },
      }),
    );
    expect(recos.length).toBe(3);
    for (const reco of recos) {
      expect(reco.type).toBe('agricultural-recommendation');
      expect(reco.source).toContain('no oficial');
      expect(reco.date).toBe(GENERATED_AT);
      expect(reco.action).toBeTruthy();
    }
    expect(recos.some((reco) => reco.title.includes('Riego'))).toBe(true);
    expect(recos.some((reco) => reco.title.includes('Repilo'))).toBe(true);
  });

  it('sin datos agrícolas no hay recomendaciones', () => {
    expect(buildAgriculturalRecommendations(responseFixture(null))).toEqual([]);
  });

  it('CRITERIO CLAVE: 0 meteorológicas + RAIF activo → contadores separados, no mezclados', () => {
    const counts = countByType([
      raifAlertToUnified(raifFixture(), 0),
      raifAlertToUnified(raifFixture({ id: 'raif-2', severidad: 'media' }), 1),
    ]);
    expect(counts.weather).toBe(0);
    expect(counts.phytosanitary).toBe(2);
    expect(counts['agricultural-recommendation']).toBe(0);
  });

  it('recommendedAction cubre niveles y públicos sin cadenas vacías', () => {
    for (const level of ['critico', 'precaucion', 'aviso', 'info'] as const) {
      for (const audience of ['Agricultura', 'Ganaderia', 'Poblacion']) {
        expect(recommendedAction(level, audience).length).toBeGreaterThan(10);
      }
    }
  });
});
