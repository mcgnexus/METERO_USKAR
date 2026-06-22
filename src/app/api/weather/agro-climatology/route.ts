import { NextResponse } from "next/server";
import { fetchAgroClimatology } from "@/services/agroClimatologyService";

const LLANO = { lat: 37.8094, lon: -2.5392, elevation: 953 };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const data = await fetchAgroClimatology(LLANO.lat, LLANO.lon, LLANO.elevation);

  if (!data) {
    return NextResponse.json(
      { error: "Agro-climatology data unavailable" },
      { status: 503 }
    );
  }

  return NextResponse.json(data);
}
