import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { generateAdminToken, verifyAdminPassword } from "@/services/adminAuth";
import { consumeAdminLoginAttempt, initializeDatabase } from "@/lib/weatherStore";

function getClientAddress(request: NextRequest): string {
  const vercelAddress = request.headers.get("x-vercel-forwarded-for");
  if (vercelAddress) return vercelAddress.trim();

  const realAddress = request.headers.get("x-real-ip");
  if (realAddress) return realAddress.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").map((value) => value.trim()).filter(Boolean).at(-1) ?? "unknown";
  return "unknown";
}

function hashClientAddress(address: string): string {
  return crypto.createHash("sha256").update(address).digest("hex");
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await initializeDatabase();
    const limit = await consumeAdminLoginAttempt(hashClientAddress(getClientAddress(request)));
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta de nuevo en 1 minuto." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }

    let body: { password?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const password = body?.password;

    if (!password || typeof password !== "string" || !verifyAdminPassword(password)) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    const token = generateAdminToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set("meteo_admin_session", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 43200,
      path: "/",
    });
    return response;
  } catch (e) {
    console.error("[admin/login]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
