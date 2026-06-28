import { NextResponse } from "next/server";
import { fetchLocalStations } from "@/services/stationService";

export async function GET(): Promise<NextResponse> {
  try {
    const stations = await fetchLocalStations();
    const response = NextResponse.json(stations);
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
    );
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
