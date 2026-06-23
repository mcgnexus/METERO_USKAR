const TABLE_CANDIDATES = ["stations", "estaciones", "mini_stations", "weather_stations", "sensores"];

interface StationRawPayload {
  lat?: unknown;
  latitude?: unknown;
  lon?: unknown;
  lng?: unknown;
  longitude?: unknown;
  elevation?: unknown;
  altitude?: unknown;
  air_temp_c?: unknown;
  air_humidity_pct?: unknown;
  pressure_hpa?: unknown;
  measured_at?: string | number | Date;
  updated_at?: string | number | Date;
  timestamp?: string | number | Date;
}

export interface LocalStationRecord {
  id?: string | number;
  node_code?: string;
  name?: string;
  location_name?: string;
  crop?: string;
  active?: boolean;
  updated_at?: string;
  measured_at?: string;
  timestamp?: string;
  ultima_actualizacion?: string;
  temperature?: number;
  temperatura?: number;
  temp?: number;
  humidity?: number;
  humedad?: number;
  hr?: number;
  pressure_hpa?: number;
  presion?: number;
  pressure?: number;
  elevation?: number;
  elevation_m?: number;
  altitude?: number;
  alt?: number;
  lat?: number;
  latitude?: number;
  lon?: number;
  lng?: number;
  longitude?: number;
  air_temp_c?: number;
  air_humidity_pct?: number;
  leaf_temp_c?: number;
  soil_moisture_pct?: number;
  battery_v?: number;
  rssi_dbm?: number;
  raw?: StationRawPayload;
  __table?: string;
}

interface InformationSchemaRow {
  table_name?: string;
}

interface ExistsRow {
  exists?: boolean;
}

function quoteIdent(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function normalizeRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows)) {
    return result.rows as T[];
  }

  return [];
}

export async function fetchLocalStations(): Promise<LocalStationRecord[]> {
  const dbUrl = process.env.STATIONS_DATABASE_URL;
  if (!dbUrl) return [];

  try {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(dbUrl);

    try {
      const latest = await sql.query(`
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
      const rows = normalizeRows<LocalStationRecord>(latest);
      if (rows.length > 0) return rows;
    } catch {
      // Fall through to table discovery.
    }

    const discovered = await sql.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = $2 ORDER BY table_name`,
      ["public", "BASE TABLE"]
    );
    const discoveredTables = normalizeRows<InformationSchemaRow>(discovered)
      .map((row) => row.table_name)
      .filter((value): value is string => Boolean(value));
    const tables = Array.from(new Set([...TABLE_CANDIDATES, ...discoveredTables]));

    for (const table of tables) {
      try {
        const checkResult = await sql.query(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1) AS "exists"`,
          [table]
        );
        const exists = normalizeRows<ExistsRow>(checkResult)[0]?.exists;
        if (!exists) {
          continue;
        }

        const dataResult = await sql.query(`SELECT * FROM ${quoteIdent(table)} LIMIT 50`);
        const rows = normalizeRows<LocalStationRecord>(dataResult);
        if (rows.length > 0) {
          return rows.map((row) => ({ ...row, __table: table }));
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
