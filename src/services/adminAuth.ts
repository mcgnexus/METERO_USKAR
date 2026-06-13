import crypto from "crypto";
import type { NextRequest } from "next/server";

const ALGORITHM = "sha256";
const TOKEN_EXPIRY_MS = 12 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set and at least 32 characters long");
  }
  return secret;
}

export function generateAdminToken(): string {
  const secret = getSecret();
  const payload = JSON.stringify({
    role: "admin",
    expiresAt: Date.now() + TOKEN_EXPIRY_MS,
  });
  const hmac = crypto.createHmac(ALGORITHM, secret).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyAdminToken(token: string): boolean {
  try {
    const secret = getSecret();
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const colonIdx = decoded.lastIndexOf(":");
    if (colonIdx === -1) return false;
    const payload = decoded.slice(0, colonIdx);
    const signature = decoded.slice(colonIdx + 1);
    const expected = crypto.createHmac(ALGORITHM, secret).update(payload).digest("hex");
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (password.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(password), Buffer.from(expected));
}

export function getAdminFromRequest(request: NextRequest): boolean {
  const token = request.cookies.get("meteo_admin_session")?.value;
  if (!token) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const colonIdx = decoded.lastIndexOf(":");
    if (colonIdx === -1) return false;
    const payload = decoded.slice(0, colonIdx);
    const data = JSON.parse(payload);
    if (data.expiresAt && Date.now() > data.expiresAt) return false;
    return verifyAdminToken(token);
  } catch {
    return false;
  }
}
