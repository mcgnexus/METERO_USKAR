import { NextRequest, NextResponse } from "next/server";
import { getLocationProfiles } from "@/lib/weatherStore";
import { generateGeographicProfiles } from "@/services/geographicProfileService";
import { verifyCronAuthorization } from "@/services/cronAuth";

export async function GET(): Promise<NextResponse> {
  const profiles = await getLocationProfiles("huescar");
  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("Authorization");
  if (!verifyCronAuthorization(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await generateGeographicProfiles();
  return NextResponse.json({ success: true, profiles });
}
