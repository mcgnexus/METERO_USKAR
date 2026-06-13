import { NextResponse } from "next/server";
import { fetchComarcaLayer } from "@/services/layerComarca";

export async function GET(): Promise<NextResponse> {
  const data = await fetchComarcaLayer(null, null, null);
  if (!data) {
    return NextResponse.json({ error: "No se pudieron obtener las estimaciones comarcales" }, { status: 503 });
  }
  const response = NextResponse.json(data);
  response.headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=600, stale-while-revalidate=900"
  );
  return response;
}
