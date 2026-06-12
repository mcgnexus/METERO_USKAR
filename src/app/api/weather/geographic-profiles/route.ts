import { NextRequest, NextResponse } from "next/server";
import { getLocationProfiles } from "@/lib/weatherStore";
import { generateGeographicProfiles } from "@/services/geographicProfileService";

export async function GET(): Promise<NextResponse> {
  const profiles = await getLocationProfiles("huescar");
  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profiles = await generateGeographicProfiles();
  return NextResponse.json({ success: true, profiles });
}
