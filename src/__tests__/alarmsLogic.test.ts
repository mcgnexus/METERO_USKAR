import { describe, it, expect } from 'vitest';
import { buildAlarms } from '@/components/llano/alarms-logic';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { WeatherAlert, WeatherPayload } from '@/types/weather';

function climate(overrides: Record<string, any> = {}): ClimateCalibrationPayload {
  return {
    location: { id: 'huescar', name: 'Huéscar', lat: 37.81, lon: -2.54, elevation: 953 },
    generatedAt: '2026-09-05T10:00:00Z',
    calibration: { realTemperatureC: 25, residualC: null, residualDefinition: 'estimated_minus_real', canTrainModel: false },
    interpolation: { inversionDetected: false, dynamicGradientCPerM: 0.006, dynamicGradientCPer100m: 0.6, estimatedTemperatureC: 25, formula: 'standard' },
    dewPoint: { dewPointC: null, frostRisk: 'none', blackFrostRisk: false },
    eto: { etoHourlyMm: 0.1, method: 'FAO56_HOURLY_PM', inputs: { temperatureC: 25, humidityPct: 44, pressureKPa: 90, solarRadiationWm2: 700, netRadiationMJm2h: 2.5, windSpeed2mMs: 2 } },
    nodes: {
      baza: {} as any,
      sanClemente: {} as any,
      localStation: { humidityPct: 44 } as any,
      radiationWind: { windSpeed2mKmh: 12 } as any,
    },
    extrapolation: { bazaWindDirectionDeg: 180 } as any,
    exoticVariables: { cloudCoverPct: 20 } as any,
    microclimate: {} as any,
    quality: { confidencePct: 80, warnings: [] },
    ...overrides,
  };
}

function weather(alerts: WeatherAlert[], currentOverrides: Record<string, any> = {}): WeatherPayload {
  return {
    location: 'Huéscar',
    latitude: 37.81,
    longitude: -2.54,
    elevation: 953,
    timezone: 'Europe/Madrid',
    source: 'FUSED',
    fetchedAt: '2026-09-05T10:00:00Z',
    confidencePct: 85,
    confidenceExplanation: '',
    dataQuality: {} as any,
    current: { time: '2026-09-05T10:00:00Z', temperatureC: 25, humidityPct: 44, windGustKmh: 10, weatherCode: 0, apparentTemperatureC: 25, precipitationMm: 0, windSpeedKmh: 5, windDirectionDeg: 180, solarRadiationWm2: 700, et0Mm: 0.1, ...currentOverrides },
    sources: [],
    sourceHealth: [],
    hourly: {} as any,
    comparisonHourly: { aemet: null, openMeteo: null },
    daily: {} as any,
    alerts,
  };
}

const calm = weather([]);

describe('buildAlarms — división de responsabilidades feed/motor', () => {
  it('mapea avisos AEMET oficiales a PulseAlarm con source aemet', () => {
    const alerts: WeatherAlert[] = [
      { type: 'wind', level: 'severo', title: 'Viento extremo', message: 'Rachas muy fuertes', source: 'aemet' },
      { type: 'rain', level: 'peligro', title: 'Lluvia intensa', message: 'Aviso amarillo', source: 'aemet' },
      { type: 'snow', level: 'aviso', title: 'Nieve', message: 'Cota baja', source: 'aemet' },
    ];
    const alarms = buildAlarms(climate(), { weather: weather(alerts) });
    const aemet = alarms.filter((a) => a.source === 'aemet');
    expect(aemet).toHaveLength(3);
    expect(aemet.map((a) => a.level)).toEqual(['critico', 'precaucion', 'aviso']);
    expect(aemet.every((a) => a.audience === 'Poblacion')).toBe(true);
  });

  it('no re-mapea las señales locales (source modelo) del feed', () => {
    const alerts: WeatherAlert[] = [
      { type: 'wind', level: 'peligro', title: 'Vientos fuertes', message: 'Rachas > 60 km/h', source: 'modelo' },
    ];
    const alarms = buildAlarms(climate(), { weather: weather(alerts) });
    expect(alarms.filter((a) => a.title.startsWith('AEMET:'))).toHaveLength(0);
  });

  it('estima el punto de rocío si el clima no lo aporta (helada negra)', () => {
    const cd = climate({
      calibration: { realTemperatureC: -1, residualC: null, residualDefinition: 'estimated_minus_real', canTrainModel: false },
      interpolation: { ...climate().interpolation, estimatedTemperatureC: -1 },
      dewPoint: { dewPointC: null, frostRisk: 'none', blackFrostRisk: false },
      nodes: {
        ...climate().nodes,
        localStation: { humidityPct: 70 } as any,
      },
    });
    const alarms = buildAlarms(cd, { weather: calm });
    expect(alarms.some((a) => a.title === 'Alerta de helada negra' && a.level === 'critico')).toBe(true);
  });

  it('genera alerta de calor extremo con temperatura actual >= 36', () => {
    const alarms = buildAlarms(climate(), { weather: weather([], { temperatureC: 37, humidityPct: 44 }) });
    expect(alarms.some((a) => a.title === 'Calor extremo' && a.level === 'critico')).toBe(true);
  });

  it('genera alerta de sequedad extrema con humedad <= 20', () => {
    const cd = climate({
      nodes: {
        ...climate().nodes,
        localStation: null,
      },
      eto: { ...climate().eto, inputs: { ...climate().eto.inputs, humidityPct: null } },
    });
    const alarms = buildAlarms(cd, { weather: weather([], { temperatureC: 20, humidityPct: 15 }) });
    expect(alarms.some((a) => a.title === 'Sequedad extrema' && a.level === 'precaucion')).toBe(true);
  });
});
