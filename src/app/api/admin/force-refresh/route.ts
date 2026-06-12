import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/services/adminAuth";
import { cacheClear } from "@/lib/inMemoryCache";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  cacheClear();
  return NextResponse.json({ success: true, message: "Caches y cooldowns limpiados correctamente" });
}
