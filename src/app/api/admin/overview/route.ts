import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/services/adminAuth";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { getCalibrationMeasurements, getComarcaEstimations } from "@/lib/weatherStore";
import { cacheKeys } from "@/lib/inMemoryCache";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tolerances, measurements, comarca, caches] = await Promise.all([
    getCalibratedTolerances(),
    getCalibrationMeasurements(45),
    getComarcaEstimations(),
    Promise.resolve(cacheKeys()),
  ]);

  return NextResponse.json({
    sourceHealth: null,
    cacheStatus: { keys: caches },
    lastSnapshot: comarca,
    calibrationMetrics: { tolerances, measurements },
  });
}
