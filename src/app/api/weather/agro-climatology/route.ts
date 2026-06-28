import { NextResponse } from "next/server";
import { fetchAgroClimatology } from "@/services/agroClimatologyService";

const LLANO = { lat: 37.8094, lon: -2.5392, elevation: 953 };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchAgroClimatology(LLANO.lat, LLANO.lon, LLANO.elevation);

    if (!data) {
      return NextResponse.json(
        { error: "Agro-climatology data unavailable" },
        { status: 503 }
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
