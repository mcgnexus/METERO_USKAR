import { NextResponse } from "next/server";
import { aggregateWeather } from "@/services/weatherAggregator";
import { fetchLightningData } from "@/services/lightningService";
import { fetchAEMETWarnings } from "@/services/aemetWarningsService";
import { fetchRadarPrecipitation } from "@/services/radarService";
import { fetchNowcast } from "@/services/nowcastService";
import { HUESCAR_COORDS } from "@/lib/geo";

export async function GET(): Promise<NextResponse> {
  const weather = await aggregateWeather();

  const lightning = await fetchLightningData(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon, 20).catch(() => null);

  const [warnings, radar, nowcast] = await Promise.all([
    fetchAEMETWarnings().catch(() => null),
    fetchRadarPrecipitation(HUESCAR_COORDS.lat, HUESCAR_COORDS.lon).catch(() => null),
    fetchNowcast(
      HUESCAR_COORDS.lat,
      HUESCAR_COORDS.lon,
      weather.current.windDirectionDeg || undefined,
      lightning
    ).catch(() => null),
  ]);

  const payload = {
    ...weather,
    lightning: lightning ?? undefined,
    aemetWarnings: warnings ?? undefined,
    radar: radar ?? undefined,
    nowcast: nowcast ?? undefined,
  };

  const response = NextResponse.json(payload);
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
  );
  return response;
}
