import { NextRequest, NextResponse } from "next/server";
import { aggregateWeather } from "@/services/weatherAggregator";
import { saveConsensusSnapshot, saveSourceMeasurement, upsertLatestSourceObservation, initializeDatabase } from "@/lib/weatherStore";
import { loadCalibratedTolerances } from "@/services/calibrationService";
import { fetchComarcaLayer } from "@/services/layerComarca";
import { saveComarcaEstimations } from "@/lib/weatherStore";
import { verifyCronAuthorization } from "@/services/cronAuth";
import { calibrateStations } from "@/services/stationCalibration";
import { fetchLocalStations } from "@/services/stationService";
import { runDailyBacktest, runBacktestRange } from "@/services/backtestingService";
import { tuneParametersFromHistory } from "@/services/modelParameterService";
import { fetchZoneWeather } from "@/services/zoneService";
import type { SourceObservation, WeatherPayload } from "@/types/weather";

async function persistSourceMeasurements(weather: WeatherPayload): Promise<void> {
  const variables: Array<[string, keyof SourceObservation, number]> = [
    ["temperature", "temperatureC", weather.current.temperatureC],
    ["humidity", "humidityPct", weather.current.humidityPct],
    ["precipitation", "precipitationMm", weather.current.precipitationMm],
    ["wind", "windSpeedKmh", weather.current.windSpeedKmh],
    ["gusts", "windGustKmh", weather.current.windGustKmh],
  ];

  await Promise.all(weather.sources.map((source) => upsertLatestSourceObservation(source.source, source)));

  for (const source of weather.sources) {
    for (const [variable, key, referenceValue] of variables) {
      const value = source[key];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      const error = value - referenceValue;
      await saveSourceMeasurement(
        weather.fetchedAt,
        source.source,
        variable,
        value,
        referenceValue,
        error,
        Math.abs(error),
        error * error
      );
    }
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("Authorization");
  if (!verifyCronAuthorization(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weather = await aggregateWeather();

  await initializeDatabase();

  await saveConsensusSnapshot(
    weather.fetchedAt,
    weather.confidencePct,
    weather as unknown as Record<string, unknown>,
    weather.confidenceExplanation
  );
  await persistSourceMeasurements(weather);

  const hour = new Date().getHours();
  let calibrationRun = false;
  let comarcaRun = false;
  let backtestRun = false;
  let zonesRun = false;
  let tuningResults: any[] | undefined;

  if (hour % 3 === 0) {
    await loadCalibratedTolerances();
    calibrationRun = true;

    const comarcaData = await fetchComarcaLayer(null, null, null);
    if (comarcaData) {
      const today = new Date().toISOString().split("T")[0];
      await saveComarcaEstimations(today, { data: comarcaData });
      comarcaRun = true;
    }

    const aemetRef = weather.sources.find((s) => s.source === "AEMET");
    if (aemetRef) {
      const stationData = await fetchLocalStations().catch(() => []);
      if (stationData.length > 0) {
        await calibrateStations(stationData, aemetRef.temperatureC, aemetRef.humidityPct).catch(() => {});
      }
    }

    try {
      await fetchZoneWeather(aemetRef ?? null);
      zonesRun = true;
    } catch {}
  }

  if (hour === 2 || hour === 3) {
    const btResult = await runDailyBacktest().catch(() => null);
    if (btResult && btResult.rowsSaved > 0) {
      backtestRun = true;
    }
    if (hour === 3) {
      await runBacktestRange(3).catch(() => {});
      const tuning = await tuneParametersFromHistory().catch(() => []);
      if (tuning && tuning.length > 0) {
        tuningResults = tuning;
      }
    }
  }

  return NextResponse.json({
    success: true,
    fetchedAt: weather.fetchedAt,
    confidencePct: weather.confidencePct,
    source: weather.source,
    calibrationRun,
    comarcaRun,
    backtestRun,
    zonesRun,
    parameterTuning: tuningResults,
  });
}
