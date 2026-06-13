import { NextResponse } from "next/server";
import { fetchZoneWeather } from "@/services/zoneService";
import { getLatestSourceObservation } from "@/lib/weatherStore";
import type { SourceObservation } from "@/types/weather";

export async function GET(): Promise<NextResponse> {
  try {
    const aemetRaw = await getLatestSourceObservation("AEMET").catch(() => null);
    const aemetObs: SourceObservation | null = aemetRaw
      ? (aemetRaw as unknown as SourceObservation)
      : null;

    const zones = await fetchZoneWeather(aemetObs);

    const response = NextResponse.json(zones);
    response.headers.set(
      "Cache-Control",
      "public, max-age=120, s-maxage=300, stale-while-revalidate=600"
    );
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error en zonas locales" },
      { status: 500 }
    );
  }
}
