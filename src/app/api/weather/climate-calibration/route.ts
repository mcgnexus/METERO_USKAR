import { NextRequest, NextResponse } from "next/server";
import { getClimateCalibrationPayload } from "@/services/climateCalibrationPayloadService";
import { initializeDatabase, saveModelResidual, upsertCurrentWeatherLlano } from "@/lib/weatherStore";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const result = await getClimateCalibrationPayload();
    const persist = request.nextUrl.searchParams.get("persist") === "1";

    if (persist) {
      await initializeDatabase();
      await upsertCurrentWeatherLlano(result.location.id, result.generatedAt, result as unknown as Record<string, unknown>);
      if (result.calibration.residualC !== null) {
        await saveModelResidual({
          measuredAt: result.generatedAt,
          model: "dynamic_gradient_baza_sanclemente_v1",
          estimatedTempC: result.interpolation.estimatedTemperatureC,
          realTempC: result.calibration.realTemperatureC,
          residualC: result.calibration.residualC,
          payload: result as unknown as Record<string, unknown>,
        });
      }
    }

    const response = NextResponse.json({ ...result, persisted: persist });
    response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
