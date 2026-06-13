import { NextRequest, NextResponse } from "next/server";
import { fetchNowcast } from "@/services/nowcastService";
import { fetchLightningData } from "@/services/lightningService";
import { HUESCAR_COORDS } from "@/lib/geo";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || String(HUESCAR_COORDS.lat));
  const lon = parseFloat(searchParams.get("lon") || String(HUESCAR_COORDS.lon));
  const windDirParam = searchParams.get("windDir");
  const windDirDeg = windDirParam ? parseFloat(windDirParam) : undefined;

  try {
    const lightning = await fetchLightningData(lat, lon).catch(() => null);
    const nowcast = await fetchNowcast(lat, lon, windDirDeg, lightning);

    return NextResponse.json(nowcast);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en nowcasting" },
      { status: 500 }
    );
  }
}
