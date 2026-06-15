import { NextRequest, NextResponse } from "next/server";
import { fetchRadarPrecipitation } from "@/services/radarService";
import { HUESCAR_COORDS } from "@/lib/geo";
import { parseCoord } from "@/lib/coords";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lat = parseCoord(searchParams.get("lat"), HUESCAR_COORDS.lat);
  const lon = parseCoord(searchParams.get("lon"), HUESCAR_COORDS.lon);

  try {
    const radarData = await fetchRadarPrecipitation(lat, lon);
    return NextResponse.json(radarData);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al obtener radar de lluvias" },
      { status: 500 }
    );
  }
}
