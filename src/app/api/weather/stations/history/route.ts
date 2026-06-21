import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse> {
  const dbUrl = process.env.STATIONS_DATABASE_URL;
  if (!dbUrl) {
    return NextResponse.json({ readings: [], error: "No STATIONS_DATABASE_URL" });
  }

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(dbUrl);

    const history: any = await sql.query(`
      SELECT
        sr.measured_at,
        sr.air_temp_c AS temperature,
        sr.air_humidity_pct AS humidity,
        sr.pressure_hpa AS pressure
      FROM sensor_readings sr
      JOIN nodes n ON n.id = sr.node_id
      WHERE n.active = true
        AND sr.air_temp_c IS NOT NULL
      ORDER BY sr.measured_at DESC
      LIMIT 48
    `);

    const rows = Array.isArray(history) ? history : history?.rows ?? [];
    return NextResponse.json({ readings: rows.reverse() });
  } catch {
    return NextResponse.json({ readings: [], error: "Error fetching station history" });
  }
}
