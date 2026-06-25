import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const dbUrl = process.env.STATIONS_DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ ok: false, error: "No STATIONS_DATABASE_URL" });
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(dbUrl);

    await sql.query(`
      CREATE TABLE IF NOT EXISTS pwa_installs (
        id SERIAL PRIMARY KEY,
        installed_at TIMESTAMPTZ DEFAULT NOW(),
        user_agent TEXT,
        referrer TEXT
      )
    `);

    const { userAgent, referrer } = await req.json().catch(() => ({}));
    await sql.query(
      `INSERT INTO pwa_installs (user_agent, referrer) VALUES ($1, $2)`,
      [userAgent ?? null, referrer ?? req.headers.get("referer") ?? null]
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[PWA Install] error:", error);
    return NextResponse.json({ ok: false, error: String(error) });
  }
}
