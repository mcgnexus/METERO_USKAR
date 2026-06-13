import { NextRequest, NextResponse } from "next/server";
import { fetchRadarPrecipitation } from "@/services/radarService";
import { HUESCAR_COORDS } from "@/lib/geo";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") || String(HUESCAR_COORDS.lat));
  const lon = parseFloat(searchParams.get("lon") || String(HUESCAR_COORDS.lon));

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
