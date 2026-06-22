import { NextResponse } from "next/server";
import { computeHourlyEto } from "@/services/climateCalibrationService";
import { fetchOpenMeteoForecast } from "@/services/openMeteoForecastService";
import {
  correctForecastHour,
  getOpenMeteoBias,
  type CorrectedHour,
} from "@/services/biasCorrectionService";

const LLANO = { lat: 37.8094, lon: -2.5392, elevation: 953 };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(7, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10)));

  const [forecast, bias] = await Promise.all([
    fetchOpenMeteoForecast(LLANO.lat, LLANO.lon, LLANO.elevation, days),
    getOpenMeteoBias(),
  ]);

  if (!forecast) {
    return NextResponse.json(
      { error: "Open-Meteo forecast unavailable", fallback: true },
      { status: 503 }
    );
  }

  const correctedDays = forecast.forecastDays.map((day) => {
    const correctedHours: CorrectedHour[] = day.hours.map((h) =>
      correctForecastHour(
        {
          time: h.time,
          temperatureC: h.temperatureC,
          humidityPct: h.humidityPct,
          dewPointC: h.dewPointC,
          vapourPressureDeficitKPa: h.vapourPressureDeficitKPa,
          pressureHPa: h.pressureHPa,
          solarRadiationWm2: h.solarRadiationWm2,
          directRadiationWm2: h.directRadiationWm2,
          diffuseRadiationWm2: h.diffuseRadiationWm2,
          windSpeed10mKmh: h.windSpeed10mKmh,
          cloudCoverPct: h.cloudCoverPct,
          visibilityM: h.visibilityM,
          uvIndex: h.uvIndex,
          capeJkg: h.capeJkg,
          isDay: h.isDay,
          soilTemp10cmC: h.soilTemp10cmC,
          soilTemp40cmC: h.soilTemp40cmC,
          soilMoisture0To1cm: h.soilMoisture0To1cm,
          soilMoisture1To3cm: h.soilMoisture1To3cm,
          soilMoisture3To9cm: h.soilMoisture3To9cm,
          soilMoisture9To27cm: h.soilMoisture9To27cm,
          soilMoisture27To81cm: h.soilMoisture27To81cm,
        },
        bias
      )
    );

    let et0TotalMm = 0;
    let etoCount = 0;
    for (const h of correctedHours) {
      if (
        h.temperatureC !== null &&
        h.humidityPct !== null &&
        h.pressureHPa !== null &&
        h.solarRadiationWm2 !== null &&
        h.windSpeed2mKmh !== null
      ) {
        const eto = computeHourlyEto({
          temperatureC: h.temperatureC,
          humidityPct: h.humidityPct,
          pressureHPa: h.pressureHPa,
          solarRadiationWm2: h.solarRadiationWm2,
          windSpeed2mKmh: h.windSpeed2mKmh,
        });
        et0TotalMm += eto.etoHourlyMm;
        etoCount++;
      }
    }
    if (etoCount > 0) {
      et0TotalMm = Math.round(et0TotalMm * 100) / 100;
    } else {
      et0TotalMm = null as unknown as number;
    }

    const temps = correctedHours.map((h) => h.temperatureC).filter((v): v is number => v !== null);
    const hums = correctedHours.map((h) => h.humidityPct).filter((v): v is number => v !== null);
    const dewPoints = correctedHours.map((h) => h.dewPointC).filter((v): v is number => v !== null);
    const vpds = correctedHours.map((h) => h.vapourPressureDeficitKPa).filter((v): v is number => v !== null);
    const winds = correctedHours.map((h) => h.windSpeed2mKmh).filter((v): v is number => v !== null);
    const rads = correctedHours.map((h) => h.solarRadiationWm2).filter((v): v is number => v !== null);
    const directRads = correctedHours.map((h) => h.directRadiationWm2).filter((v): v is number => v !== null);
    const diffuseRads = correctedHours.map((h) => h.diffuseRadiationWm2).filter((v): v is number => v !== null);
    const clouds = correctedHours.map((h) => h.cloudCoverPct).filter((v): v is number => v !== null);
    const visibility = correctedHours.map((h) => h.visibilityM).filter((v): v is number => v !== null);
    const uv = correctedHours.map((h) => h.uvIndex).filter((v): v is number => v !== null);
    const cape = correctedHours.map((h) => h.capeJkg).filter((v): v is number => v !== null);
    const soils10 = correctedHours.map((h) => h.soilTemp10cmC).filter((v): v is number => v !== null);
    const soils40 = correctedHours.map((h) => h.soilTemp40cmC).filter((v): v is number => v !== null);
    const sm01 = correctedHours.map((h) => h.soilMoisture0To1cm).filter((v): v is number => v !== null);
    const sm13 = correctedHours.map((h) => h.soilMoisture1To3cm).filter((v): v is number => v !== null);
    const sm39 = correctedHours.map((h) => h.soilMoisture3To9cm).filter((v): v is number => v !== null);
    const sm927 = correctedHours.map((h) => h.soilMoisture9To27cm).filter((v): v is number => v !== null);
    const sm2781 = correctedHours.map((h) => h.soilMoisture27To81cm).filter((v): v is number => v !== null);

    const mean = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
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
        et0TotalMm: etoCount > 0 ? et0TotalMm : null,
      },
      hours: correctedHours,
    };
  });

  return NextResponse.json({
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
  });
}
