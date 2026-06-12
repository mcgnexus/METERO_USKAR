import { NextResponse } from "next/server";
import { aggregateWeather } from "@/services/weatherAggregator";
import { fetchLightningData } from "@/services/lightningService";
import { fetchAEMETWarnings } from "@/services/aemetWarningsService";
import { HUESCAR_COORDS } from "@/lib/geo";
export async function GET(): Promise<NextResponse> {
  const weather = await aggregateWeather();

  const [lightning, warnings] = await Promise.all([
    fetchLightningData(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, 20).catch(() => null),
    fetchAEMETWarnings().catch(() => null),
  ]);

  const payload = {
    ...weather,
    lightning: lightning ?? undefined,
    aemetWarnings: warnings ?? undefined,
  };

  const response = NextResponse.json(payload);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
  );
  return response;
}
