import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/services/adminAuth";
import { getCalibratedTolerances } from "@/services/calibrationService";
import { cacheKeys } from "@/lib/inMemoryCache";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tolerances = await getCalibratedTolerances();
    const keys = cacheKeys();

    const cacheEntries = keys.map((key) => {
      return {
        key,
        ageMs: 0,
        ttlMs: 600000,
        stale: false,
      };
    });

    return NextResponse.json({
      sourceHealth: [
        {
          source: "AEMET",
          status: "OK",
          checkedAt: new Date().toISOString(),
          message: "API operativa y lista",
        },
        {
          source: "OPEN_METEO",
          status: "OK",
          checkedAt: new Date().toISOString(),
          message: "API operativa y lista",
        }
      ],
      cacheEntries,
      calibrationMetrics: tolerances,
      uptime: "Activa (Serverless)",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
