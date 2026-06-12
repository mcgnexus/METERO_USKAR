import { NextResponse } from "next/server";
import { fetchAEMETWarnings } from "@/services/aemetWarningsService";

export async function GET(): Promise<NextResponse> {
  const warnings = await fetchAEMETWarnings();
  const response = NextResponse.json(warnings);
  response.headers.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=600, stale-while-revalidate=900"
  );
  return response;
}
