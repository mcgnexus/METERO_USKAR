const TABLE_CANDIDATES = ["stations", "estaciones", "mini_stations", "weather_stations", "sensores"];

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function fetchLocalStations(): Promise<any[]> {
  const dbUrl = process.env.STATIONS_DATABASE_URL;
  if (!dbUrl) return [];

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(dbUrl);

    try {
      const latest: any = await sql.query(`
        SELECT DISTINCT ON (n.id)
          n.id,
          n.node_code,
          n.name,
          n.location_name,
          n.crop,
          n.active,
          sr.measured_at AS updated_at,
          sr.air_temp_c AS temperature,
          sr.air_humidity_pct AS humidity,
          sr.pressure_hpa AS pressure_hpa,
          sr.leaf_temp_c AS leaf_temp_c,
          sr.soil_moisture_pct AS soil_moisture_pct,
          sr.battery_v AS battery_v,
          sr.rssi_dbm AS rssi_dbm,
          sr.raw,
          'sensor_readings' AS __table
        FROM nodes n
        LEFT JOIN sensor_readings sr ON sr.node_id = n.id
        WHERE n.active = true
        ORDER BY n.id, sr.measured_at DESC NULLS LAST
        LIMIT 50
      `);
      const rows = Array.isArray(latest) ? latest : latest?.rows ?? [];
      if (rows.length > 0) return rows;
    } catch {
    }

    const discovered: any = await sql.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = $2 ORDER BY table_name`,
      ["public", "BASE TABLE"]
    );
    const discoveredTables = (Array.isArray(discovered) ? discovered : discovered?.rows ?? [])
      .map((row: any) => row.table_name)
      .filter(Boolean);
    const tables = Array.from(new Set([...TABLE_CANDIDATES, ...discoveredTables]));

    for (const table of tables) {
      try {
        const checkResult: any = await sql.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) AS "exists"`, [table]
        );
        const exists = Array.isArray(checkResult) ? checkResult[0]?.exists : checkResult?.rows?.[0]?.exists;
        if (exists) {
          const dataResult: any = await sql.query(`SELECT * FROM ${quoteIdent(table)} LIMIT 50`);
          const rows = Array.isArray(dataResult) ? dataResult : dataResult?.rows ?? [];
          if (rows.length > 0) return rows.map((row: any) => ({ ...row, __table: table }));
        }
      } catch {
        continue;
      }
    }

    return [];
  } catch {
    return [];
  }
}
