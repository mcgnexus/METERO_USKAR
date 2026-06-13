import crypto from "crypto";

export function verifyCronAuthorization(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !authHeader) return false;

  const expected = `Bearer ${secret}`;
  const auth = Buffer.from(authHeader);
  const target = Buffer.from(expected);

  if (auth.length !== target.length) return false;
  return crypto.timingSafeEqual(auth, target);
}
