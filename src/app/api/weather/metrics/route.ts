import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/services/adminAuth";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { getCalibrationMeasurements } from "@/lib/weatherStore";
import { getValidationHistory, getAggregatedValidation } from "@/lib/weatherStore";
import { getModelParameters, getDefaultParameters } from "@/services/modelParameterService";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const detail = searchParams.get("detail") === "true";

    const [
      tolerances,
      measurements,
      validationHistory,
      aggregatedValidation,
      modelParams,
      defaultParams,
    ] = await Promise.all([
      getCalibratedTolerances(),
      getCalibrationMeasurements(45),
      detail ? getValidationHistory(30) : Promise.resolve([]),
      getAggregatedValidation(30),
      getModelParameters(),
      Promise.resolve(getDefaultParameters()),
    ]);

    return NextResponse.json({
      tolerances,
      measurements,
      aggregatedValidation,
      validationHistory: detail ? validationHistory : undefined,
      modelParameters: {
        current: modelParams,
        defaults: defaultParams,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
