import type { HuescarWeatherResponse } from '@/types/weather-response';
import type { ClimateCalibrationPayload } from '@/types/climate';
import type { RaifAlert } from '@/types/raif';

/**
 * Respuesta completa mínima para pruebas de render/hidratación.
 * Cubre los campos que consumen las 5 pantallas y los motores de aviso.
 */
export const NOW_ISO = '2026-09-08T10:00:00Z';

export function buildClimate(): ClimateCalibrationPayload {
  return {
    location: { id: 'huescar', name: 'Huéscar', lat: 37.75, lon: -2.53, elevation: 960 },
    generatedAt: NOW_ISO,
    nodes: {
      baza: { temperatureC: 13, humidityPct: 58, windSpeedKmh: 8, observedAt: NOW_ISO },
      sanClemente: { temperatureC: 12, humidityPct: 61, windSpeedKmh: 9, observedAt: NOW_ISO },
      localStation: { temperatureC: 12.4, humidityPct: 62, windSpeedKmh: 7, observedAt: NOW_ISO },
      radiationWind: { radiationWm2: 420, windSpeedKmh: 7.5, observedAt: NOW_ISO },
    },
    interpolation: {
      inversionDetected: false,
      dynamicGradientCPerM: -0.006,
      dynamicGradientCPer100m: -0.6,
      estimatedTemperatureC: 12.1,
      formula: 'idw+baja',
    },
    dewPoint: { dewPointC: 5.2, frostRisk: 'none', blackFrostRisk: false },
    eto: { etoHourlyMm: 0.21, inputs: { humidityPct: 60 } },
    exoticVariables: { cloudCoverPct: 25, soilTemp10cmC: 19.5 },
    extrapolation: { bazaWindDirectionDeg: 180, humidityPct: 62, pressureHPa: 1015, humidityMethod: 'idw', deltaZ: 250, negrat: null, n: 180 },
    microclimate: { inversionConditions: false, coldAirDrainageC: -1.2, totalCorrectionC: -0.4, windGustReductionFactor: 0.85 },
    calibration: { realTemperatureC: 12.3, biasC: 0.2, residualC: 0.4, canTrainModel: true },
  } as unknown as ClimateCalibrationPayload;
}

export function buildHuescarResponse(overrides?: {
  staleSources?: boolean;
  alerts?: HuescarWeatherResponse['alerts'];
}): HuescarWeatherResponse {
  const t = (hour: number) => `2026-09-08T${String(hour).padStart(2, '0')}:00:00Z`;
  return {
    schemaVersion: 1,
    municipality: 'Huéscar',
    location: { name: 'Huéscar', lat: 37.75, lon: -2.53, elevation: 960 },
    timezone: 'Europe/Madrid',
    generatedAt: NOW_ISO,
    model: 'ecmwf',
    current: {
      time: NOW_ISO,
      temperatureC: 12.3,
      apparentTemperatureC: 11.5,
      humidityPct: 62,
      windSpeedKmh: 7.5,
      windGustKmh: 14,
      precipitationMm: 0,
      weatherCode: 1,
      dewPointC: 5.2,
      sourceName: 'Sensor local auditado',
    },
    hourly: [8, 9, 10, 11, 12].map((hour) => ({
      time: t(hour),
      temperatureC: 11 + hour * 0.4,
      humidityPct: 60,
      precipitationProbabilityPct: 5,
      precipitationMm: 0,
      weatherCode: 1,
      windSpeedKmh: 8,
      sourceId: 'open_meteo',
    })),
    daily: ['2026-09-08', '2026-09-09', '2026-09-10'].map((date, index) => ({
      date,
      temperatureMaxC: 24 + index,
      temperatureMinC: 9 - index,
      precipitationProbabilityPct: 10,
      precipitationSumMm: 0,
      windGustKmh: 20,
      weatherCode: 1,
      sourceId: 'open_meteo',
    })),
    alerts: overrides?.alerts ?? [],
    sources: [
      {
        name: 'Open-Meteo ECMWF',
        type: 'forecast',
        updatedAt: NOW_ISO,
        status: 'active',
        model: 'ECMWF IFS',
        message: 'Previsión horaria operativa.',
      },
      {
        name: 'AEMET Baza',
        type: 'official-alert',
        updatedAt: NOW_ISO,
        status: overrides?.staleSources ? 'stale' : 'active',
        message: overrides?.staleSources ? 'Dato de hace 3 h: más antiguo que la ventana de validez.' : 'Avisos oficiales operativos.',
      },
    ],
    updatedAtLabel: '08/09/2026 12:00',
    climate: buildClimate(),
    weather: {
      location: 'Huéscar',
      latitude: 37.75,
      longitude: -2.53,
      elevation: 960,
      timezone: 'Europe/Madrid',
      source: 'FUSED',
      fetchedAt: NOW_ISO,
      confidencePct: 92,
      confidenceExplanation: 'Sensor local y modelo de acuerdo.',
      dataQuality: { label: 'Buena', reasons: [] },
      current: {
        time: NOW_ISO,
        temperatureC: 12.3,
        humidityPct: 62,
        windSpeedKmh: 7.5,
        windDirectionDeg: 180,
        precipitationMm: 0,
        pressureHpa: 1015,
        weatherCode: 1,
      },
      sources: [],
      daily: {
        time: ['2026-09-08', '2026-09-09'],
        temperatureMaxC: [24, 25],
        temperatureMinC: [9, 8],
        precipitationProbabilityPct: [10, 20],
        precipitationSumMm: [0, 0.2],
        weatherCode: [1, 3],
      },
      agricultural: {
        et0CumulativeMm: 3.4,
        gddCumulative: 1150,
        chillHours: 40,
        frostRisk48h: 'none',
        workability: { workable: true, reasons: [] },
      },
    } as unknown as HuescarWeatherResponse['weather'],
    forecast: {
      location: { lat: 37.75, lon: -2.53, elevation: 960 },
      generatedAt: NOW_ISO,
      forecastSource: 'open-meteo',
      biasCorrection: { applied: false, note: '' },
      forecastDays: [
        {
          date: '2026-09-08',
          dailySummary: {
            date: '2026-09-08',
            tempMinC: 9,
            tempMaxC: 24,
            tempMeanC: 16,
            humidityMeanPct: 55,
            dewPointMeanC: 5,
            vapourPressureDeficitMeanKPa: 0.6,
            windMeanKmh: 8,
            radiationTotalMJm2: 18,
            directRadiationTotalMJm2: 12,
            diffuseRadiationTotalMJm2: 6,
            cloudCoverMeanPct: 25,
          },
          hours: [],
        },
      ],
    } as unknown as HuescarWeatherResponse['forecast'],
  };
}

export const RAIF_PAYLOAD = {
  alerts: [
    {
      id: 'raif-test-1',
      titulo: 'Aviso por Prays oleae',
      cultivo: 'Olivar',
      zona: 'Altiplano',
      provincia: 'Granada',
      plaga: 'Prays oleae',
      severidad: 'media',
      tipo: 'accionable',
      estado: 'active',
      resumen: 'Vuelo activo en la comarca.',
      medidas: ['Monitorizar trampas'],
      validaDesde: '2026-09-01T00:00:00Z',
      validaHasta: '2026-09-15T00:00:00Z',
      fuenteUrl: 'https://www.juntadeandalucia.es/raif',
      creado: '2026-09-01T08:00:00Z',
    } satisfies RaifAlert,
  ],
  count: 1,
  fetchedAt: NOW_ISO,
  source: 'RAIF' as const,
  zone: 'granada_interior',
};
