import { NextResponse } from "next/server";
import { fetchClimateNormals } from "@/services/climateNormalsService";

const LLANO = { lat: 37.8094, lon: -2.5392 };

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await fetchClimateNormals(LLANO.lat, LLANO.lon);
    if (!data) {
      return NextResponse.json({ error: "Climate normals unavailable" }, { status: 503 });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Error interno" }, { status: 500 });
  }
}
