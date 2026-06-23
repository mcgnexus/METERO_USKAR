import { NextResponse } from "next/server";
import {
  getCurrentWeatherPayload,
  WeatherUnavailableError,
} from "@/services/currentWeatherService";

export async function GET(): Promise<NextResponse> {
  try {
    const payload = await getCurrentWeatherPayload();
    const response = NextResponse.json(payload);
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=120, stale-while-revalidate=300"
    );
    return response;
  } catch (error) {
    const message = error instanceof WeatherUnavailableError
      ? error.message
      : "No se pudo obtener el tiempo actual.";

    return NextResponse.json(
      { error: message },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
