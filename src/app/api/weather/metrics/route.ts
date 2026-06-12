import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/services/adminAuth";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { getCalibrationMeasurements } from "@/lib/weatherStore";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tolerances, measurements] = await Promise.all([
    getCalibratedTolerances(),
    getCalibrationMeasurements(45),
  ]);

  return NextResponse.json({ tolerances, measurements });
}
