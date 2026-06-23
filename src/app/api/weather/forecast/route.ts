import { NextResponse } from "next/server";
import { getForecastPayload } from "@/services/forecastPayloadService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Math.min(16, Math.max(1, parseInt(url.searchParams.get("days") || "14", 10)));

  const payload = await getForecastPayload(days);

  if (!payload) {
    return NextResponse.json(
      { error: "Open-Meteo forecast unavailable", fallback: true },
      { status: 503 }
    );
  }

  return NextResponse.json(payload);
}
