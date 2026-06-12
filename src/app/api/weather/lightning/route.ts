import { NextRequest, NextResponse } from "next/server";
import { fetchLightningData } from "@/services/lightningService";
import { HUESCAR_COORDS } from "@/lib/geo";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? String(HUESCAR_COORDS.lat));
  const lon = parseFloat(searchParams.get("lon") ?? String(HUESCAR_COORDS.lon));
  const radius = parseInt(searchParams.get("radius") ?? "20", 10);

  const lightning = await fetchLightningData(lat, lon, radius);
  const response = NextResponse.json(lightning);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=180"
  );
  return response;
}
