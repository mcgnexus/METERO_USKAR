import { getCachedOrRefresh } from "@/lib/persistentCache";
import { computeHourlyEto } from "@/services/climateCalibrationService";
import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastService";
import { fetchObservationLayer } from "@/services/layerObservation";
import {
  correctForecastHour,
  getOpenMeteoBias,
  type CorrectedHour,
} from "@/services/biasCorrectionService";
import type { ForecastPayload } from "@/types/forecast";

const LLANO = { lat: 37.8094, lon: -2.5392, elevation: 953 };
const FORECAST_CACHE_TTL_MS = 5 * 60_000;
const FORECAST_STALE_MS = 30 * 60_000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hoursBetween(startIso: string, endIso: string): number {
  return Math.max(0, (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3600000);
}

function applyLiveObservationAnchor(
  hour: CorrectedHour,
  current: Awaited<ReturnType<typeof fetchObservationLayer>>["current"] | null,
  firstHour: CorrectedHour | null
): CorrectedHour {
  if (!current || !firstHour || hour.temperatureC === null || firstHour.temperatureC === null) return hour;

  const hoursAhead = hoursBetween(firstHour.time, hour.time);
  const tempFactor = Math.max(0, 1 - hoursAhead / 72);
  const weatherFactor = Math.max(0, 1 - hoursAhead / 36);
  const tempDelta = current.temperatureC - firstHour.temperatureC;
  const humidityDelta = firstHour.humidityPct !== null ? current.humidityPct - firstHour.humidityPct : 0;
  const windDelta = firstHour.windSpeed2mKmh !== null ? current.windSpeedKmh - firstHour.windSpeed2mKmh : 0;

  return {
    ...hour,
    temperatureC: Math.round((hour.temperatureC + tempDelta * tempFactor) * 10) / 10,
    humidityPct: hour.humidityPct !== null
      ? Math.round(clamp(hour.humidityPct + humidityDelta * weatherFactor, 0, 100))
      : hour.humidityPct,
    windSpeed2mKmh: hour.windSpeed2mKmh !== null
      ? Math.round(Math.max(0, hour.windSpeed2mKmh + windDelta * weatherFactor) * 100) / 100
      : hour.windSpeed2mKmh,
  };
}

export async function getForecastPayload(days: number = 14): Promise<ForecastPayload | null> {
  const safeDays = Math.min(16, Math.max(1, days));

  return getCachedOrRefresh({
    key: `weather:forecast-payload:v1:${safeDays}`,
    ttlMs: FORECAST_CACHE_TTL_MS,
    staleMs: FORECAST_STALE_MS,
    load: async () => {
      const [forecast, bias, observation] = await Promise.all([
        fetchOpenMeteoForecast(LLANO.lat, LLANO.lon, LLANO.elevation, safeDays),
        getOpenMeteoBias(),
        fetchObservationLayer().catch(() => null),
      ]);

      if (!forecast) {
        return null;
      }

      let firstCorrectedHour: CorrectedHour | null = null;

      const correctedDays = forecast.forecastDays.map((day) => {
        const correctedHours: CorrectedHour[] = day.hours.map((hour) => {
          const corrected =
          correctForecastHour(
            {
              time: hour.time,
              temperatureC: hour.temperatureC,
              humidityPct: hour.humidityPct,
              dewPointC: hour.dewPointC,
              vapourPressureDeficitKPa: hour.vapourPressureDeficitKPa,
              pressureHPa: hour.pressureHPa,
              solarRadiationWm2: hour.solarRadiationWm2,
              directRadiationWm2: hour.directRadiationWm2,
              diffuseRadiationWm2: hour.diffuseRadiationWm2,
              windSpeed10mKmh: hour.windSpeed10mKmh,
              cloudCoverPct: hour.cloudCoverPct,
              visibilityM: hour.visibilityM,
              uvIndex: hour.uvIndex,
              capeJkg: hour.capeJkg,
              isDay: hour.isDay,
              soilTemp10cmC: hour.soilTemp10cmC,
              soilTemp40cmC: hour.soilTemp40cmC,
              soilMoisture0To1cm: hour.soilMoisture0To1cm,
              soilMoisture1To3cm: hour.soilMoisture1To3cm,
              soilMoisture3To9cm: hour.soilMoisture3To9cm,
              soilMoisture9To27cm: hour.soilMoisture9To27cm,
              soilMoisture27To81cm: hour.soilMoisture27To81cm,
            },
            bias
          );
          if (!firstCorrectedHour) firstCorrectedHour = corrected;
          return applyLiveObservationAnchor(corrected, observation?.current ?? null, firstCorrectedHour);
        });

        let et0TotalMm = 0;
        let etoCount = 0;
        for (const hour of correctedHours) {
          if (
            hour.temperatureC !== null &&
            hour.humidityPct !== null &&
            hour.pressureHPa !== null &&
            hour.solarRadiationWm2 !== null &&
            hour.windSpeed2mKmh !== null
          ) {
            const eto = computeHourlyEto({
              temperatureC: hour.temperatureC,
              humidityPct: hour.humidityPct,
              pressureHPa: hour.pressureHPa,
              solarRadiationWm2: hour.solarRadiationWm2,
              windSpeed2mKmh: hour.windSpeed2mKmh,
            });
            et0TotalMm += eto.etoHourlyMm;
            etoCount++;
          }
        }

        const temps = correctedHours.map((hour) => hour.temperatureC).filter((value): value is number => value !== null);
        const hums = correctedHours.map((hour) => hour.humidityPct).filter((value): value is number => value !== null);
        const dewPoints = correctedHours.map((hour) => hour.dewPointC).filter((value): value is number => value !== null);
        const vpds = correctedHours.map((hour) => hour.vapourPressureDeficitKPa).filter((value): value is number => value !== null);
        const winds = correctedHours.map((hour) => hour.windSpeed2mKmh).filter((value): value is number => value !== null);
        const rads = correctedHours.map((hour) => hour.solarRadiationWm2).filter((value): value is number => value !== null);
        const directRads = correctedHours.map((hour) => hour.directRadiationWm2).filter((value): value is number => value !== null);
        const diffuseRads = correctedHours.map((hour) => hour.diffuseRadiationWm2).filter((value): value is number => value !== null);
        const clouds = correctedHours.map((hour) => hour.cloudCoverPct).filter((value): value is number => value !== null);
        const visibility = correctedHours.map((hour) => hour.visibilityM).filter((value): value is number => value !== null);
        const uv = correctedHours.map((hour) => hour.uvIndex).filter((value): value is number => value !== null);
        const cape = correctedHours.map((hour) => hour.capeJkg).filter((value): value is number => value !== null);
        const soils10 = correctedHours.map((hour) => hour.soilTemp10cmC).filter((value): value is number => value !== null);
        const soils40 = correctedHours.map((hour) => hour.soilTemp40cmC).filter((value): value is number => value !== null);
        const sm01 = correctedHours.map((hour) => hour.soilMoisture0To1cm).filter((value): value is number => value !== null);
        const sm13 = correctedHours.map((hour) => hour.soilMoisture1To3cm).filter((value): value is number => value !== null);
        const sm39 = correctedHours.map((hour) => hour.soilMoisture3To9cm).filter((value): value is number => value !== null);
        const sm927 = correctedHours.map((hour) => hour.soilMoisture9To27cm).filter((value): value is number => value !== null);
        const sm2781 = correctedHours.map((hour) => hour.soilMoisture27To81cm).filter((value): value is number => value !== null);

        const mean = (values: number[]) => values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
        const radiationTotalMJ = rads.length > 0
          ? Math.round(rads.reduce((a, b) => a + Math.max(0, b) * 0.0036, 0) * 10) / 10
          : null;
        const directRadiationTotalMJ = directRads.length > 0
          ? Math.round(directRads.reduce((a, b) => a + Math.max(0, b) * 0.0036, 0) * 10) / 10
          : null;
        const diffuseRadiationTotalMJ = diffuseRads.length > 0
          ? Math.round(diffuseRads.reduce((a, b) => a + Math.max(0, b) * 0.0036, 0) * 10) / 10
          : null;

        return {
          date: day.date,
          dailySummary: {
            date: day.date,
            tempMinC: temps.length > 0 ? Math.round(Math.min(...temps) * 10) / 10 : null,
            tempMaxC: temps.length > 0 ? Math.round(Math.max(...temps) * 10) / 10 : null,
            tempMeanC: mean(temps),
            humidityMeanPct: mean(hums),
            dewPointMeanC: mean(dewPoints),
            vapourPressureDeficitMeanKPa: mean(vpds),
            windMeanKmh: mean(winds),
            radiationTotalMJm2: radiationTotalMJ,
            directRadiationTotalMJm2: directRadiationTotalMJ,
            diffuseRadiationTotalMJm2: diffuseRadiationTotalMJ,
            cloudCoverMeanPct: mean(clouds),
            visibilityMeanM: mean(visibility),
            uvIndexMax: uv.length > 0 ? Math.round(Math.max(...uv) * 10) / 10 : null,
            capeMaxJkg: cape.length > 0 ? Math.round(Math.max(...cape) * 10) / 10 : null,
            soilTemp10cmMeanC: mean(soils10),
            soilTemp40cmMeanC: mean(soils40),
            soilMoisture0To1cmMean: mean(sm01),
            soilMoisture1To3cmMean: mean(sm13),
            soilMoisture3To9cmMean: mean(sm39),
            soilMoisture9To27cmMean: mean(sm927),
            soilMoisture27To81cmMean: mean(sm2781),
            et0TotalMm: etoCount > 0 ? Math.round(et0TotalMm * 100) / 100 : null,
          },
          hours: correctedHours,
        };
      });

      return {
        location: LLANO,
        generatedAt: new Date().toISOString(),
        forecastSource: "open_meteo",
        biasCorrection: {
          computedAt: bias.computedAt,
          sampleCount: bias.sampleCount,
          temperature: { all: bias.temperatureAll, day: bias.temperatureDay, night: bias.temperatureNight },
          humidity: bias.humidityAll,
          wind: bias.windAll,
          radiation: bias.radiationAll,
        },
        forecastDays: correctedDays,
      };
    },
  });
}
