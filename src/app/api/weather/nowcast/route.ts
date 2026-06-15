import { NextRequest, NextResponse } from "next/server";
import { fetchNowcast } from "@/services/nowcastService";
import { fetchLightningData } from "@/services/lightningService";
import { HUESCAR_COORDS } from "@/lib/geo";
import { parseCoord } from "@/lib/coords";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lat = parseCoord(searchParams.get("lat"), HUESCAR_COORDS.lat);
  const lon = parseCoord(searchParams.get("lon"), HUESCAR_COORDS.lon);
  const windDirParam = searchParams.get("windDir");
  const windDirDeg = windDirParam !== null && windDirParam.trim() !== ""
    ? (Number.isFinite(parseFloat(windDirParam)) ? parseFloat(windDirParam) : undefined)
    : undefined;

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
