import { NextRequest, NextResponse } from "next/server";
import { aggregateWeather } from "@/services/weatherAggregator";
import { saveConsensusSnapshot } from "@/lib/weatherStore";
import { loadCalibratedTolerances } from "@/services/calibrationService";
import { fetchComarcaLayer } from "@/services/layerComarca";
import { saveComarcaEstimations } from "@/lib/weatherStore";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const weather = await aggregateWeather();

  await saveConsensusSnapshot(
    weather.fetchedAt,
    weather.confidencePct,
    weather as unknown as Record<string, unknown>,
    weather.confidenceExplanation
  );

  const hour = new Date().getHours();
  let calibrationRun = false;
  let comarcaRun = false;

  if (hour % 3 === 0) {
    await loadCalibratedTolerances();
    calibrationRun = true;

    const comarcaData = await fetchComarcaLayer(null, null, null);
    if (comarcaData) {
      const today = new Date().toISOString().split("T")[0];
      await saveComarcaEstimations(today, { data: comarcaData });
      comarcaRun = true;
    }
  }

  return NextResponse.json({
    success: true,
    fetchedAt: weather.fetchedAt,
    confidencePct: weather.confidencePct,
    source: weather.source,
    calibrationRun,
    comarcaRun,
  });
}
