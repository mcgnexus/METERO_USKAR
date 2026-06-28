import { NextResponse } from "next/server";
import { fetchRaifAlertsForZone } from "@/services/raifClient";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const zone = searchParams.get("zone") || "granada_interior";

    const payload = await fetchRaifAlertsForZone(zone);

    const response = NextResponse.json(payload);
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, s-maxage=600, stale-while-revalidate=900"
    );
    return response;
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
