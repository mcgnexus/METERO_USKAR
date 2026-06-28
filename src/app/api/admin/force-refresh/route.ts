import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/services/adminAuth";
import { cacheClear } from "@/lib/inMemoryCache";

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!getAdminFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    cacheClear();
    return NextResponse.json({ success: true, message: "Caches y cooldowns limpiados correctamente" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error interno" },
      { status: 500 }
    );
  }
}
