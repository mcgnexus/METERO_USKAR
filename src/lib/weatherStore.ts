import { Pool } from '@neondatabase/serverless';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres' });
  }
  return pool;
}

async function safeQuery(text: string, params?: any[]): Promise<any[]> {
  try {
    const result = await getPool().query(text, params);
    return result.rows ?? [];
  } catch {
    return [];
  }
}

async function safeExecute(text: string, params?: any[]): Promise<void> {
  try {
    await getPool().query(text, params);
  } catch {
  }
}

const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS consensus_snapshots (
  consensus_time TIMESTAMPTZ PRIMARY KEY,
  confidence FLOAT,
  estimate_json JSONB,
  explanation TEXT
);
CREATE TABLE IF NOT EXISTS source_measurements (
  id SERIAL PRIMARY KEY,
  snapshot_id TIMESTAMPTZ REFERENCES consensus_snapshots(consensus_time),
  source TEXT, variable TEXT, value FLOAT, reference_value FLOAT,
  error FLOAT, absolute_error FLOAT, squared_error FLOAT
);
CREATE TABLE IF NOT EXISTS forecast_predictions (
  id SERIAL PRIMARY KEY, source TEXT, issued_at TIMESTAMPTZ,
  valid_for TIMESTAMPTZ, lead_hours INT, variable TEXT,
  predicted_value FLOAT, observed_value FLOAT, error FLOAT
);
CREATE TABLE IF NOT EXISTS latest_source_observations (
  source TEXT PRIMARY KEY, observation JSONB
);
CREATE TABLE IF NOT EXISTS external_calibration_measurements (
  source TEXT, observation_date DATE, variable TEXT,
  observed_value FLOAT, predicted_value FLOAT, error FLOAT,
  absolute_error FLOAT, squared_error FLOAT,
  PRIMARY KEY (source, observation_date, variable)
);
CREATE TABLE IF NOT EXISTS comarca_estimations (
  reference_date DATE PRIMARY KEY, payload JSONB
);
CREATE TABLE IF NOT EXISTS location_profiles (
  location_id TEXT, version TEXT, is_active BOOLEAN DEFAULT true,
  payload JSONB, generated_at TIMESTAMPTZ,
  PRIMARY KEY (location_id, version)
);
`;

let initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (initialized) return;
  await safeExecute(CREATE_TABLES_SQL);
  initialized = true;
}

export async function saveConsensusSnapshot(
  consensusTime: string, confidence: number,
  estimateJson: Record<string, unknown>, explanation: string
): Promise<void> {
  await safeExecute(
    `INSERT INTO consensus_snapshots (consensus_time, confidence, estimate_json, explanation)
     VALUES ($1, $2, $3, $4) ON CONFLICT (consensus_time) DO NOTHING`,
    [consensusTime, confidence, JSON.stringify(estimateJson), explanation]
  );
}

export async function saveSourceMeasurement(
  snapshotId: string, source: string, variable: string,
  value: number, refValue: number, error: number, absError: number, sqError: number
): Promise<void> {
  await safeExecute(
    `INSERT INTO source_measurements (snapshot_id, source, variable, value, reference_value, error, absolute_error, squared_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [snapshotId, source, variable, value, refValue, error, absError, sqError]
  );
}

export async function saveForecastPrediction(
  source: string, issuedAt: string, validFor: string, leadHours: number,
  variable: string, predicted: number, observed: number, errorNum: number
): Promise<void> {
  await safeExecute(
    `INSERT INTO forecast_predictions (source, issued_at, valid_for, lead_hours, variable, predicted_value, observed_value, error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [source, issuedAt, validFor, leadHours, variable, predicted, observed, errorNum]
  );
}

export async function getLatestSourceObservation(source: string): Promise<Record<string, unknown> | null> {
  const rows = await safeQuery(
    `SELECT observation FROM latest_source_observations WHERE source = $1`, [source]
  );
  return rows[0]?.observation ?? null;
}

export async function upsertLatestSourceObservation(source: string, observation: Record<string, unknown>): Promise<void> {
  await safeExecute(
    `INSERT INTO latest_source_observations (source, observation)
     VALUES ($1, $2) ON CONFLICT (source) DO UPDATE SET observation = $2`,
    [source, JSON.stringify(observation)]
  );
}

export async function getCalibrationMeasurements(daysBack: number): Promise<{ variable: string; mae: number }[]> {
  const rows = await safeQuery(
    `SELECT variable, AVG(absolute_error) AS mae
     FROM external_calibration_measurements
     WHERE observation_date >= CURRENT_DATE - $1::integer
     GROUP BY variable`,
    [daysBack]
  );
  return (rows ?? []).map((r: any) => ({ variable: r.variable, mae: Number(r.mae) })).filter(r => r.mae > 0);
}

export async function saveExternalCalibration(
  source: string, date: string, variable: string, observed: number, predicted: number
): Promise<void> {
  const errorVal = observed - predicted;
  await safeExecute(
    `INSERT INTO external_calibration_measurements (source, observation_date, variable, observed_value, predicted_value, error, absolute_error, squared_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (source, observation_date, variable) DO NOTHING`,
    [source, date, variable, observed, predicted, errorVal, Math.abs(errorVal), errorVal * errorVal]
  );
}

export async function getComarcaEstimations(): Promise<{ reference_date: string; payload: any } | null> {
  const rows = await safeQuery(
    `SELECT reference_date, payload FROM comarca_estimations ORDER BY reference_date DESC LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function saveComarcaEstimations(date: string, payload: Record<string, unknown>): Promise<void> {
  await safeExecute(
    `INSERT INTO comarca_estimations (reference_date, payload)
     VALUES ($1, $2) ON CONFLICT (reference_date) DO UPDATE SET payload = $2`,
    [date, JSON.stringify(payload)]
  );
}

export async function getLocationProfiles(locationId: string): Promise<any | null> {
  const rows = await safeQuery(
    `SELECT location_id, version, is_active, payload, generated_at
     FROM location_profiles WHERE location_id = $1 AND is_active = true
     ORDER BY generated_at DESC LIMIT 1`,
    [locationId]
  );
  return rows[0] ?? null;
}

export async function saveLocationProfile(locationId: string, version: string, payload: Record<string, unknown>): Promise<void> {
  await safeExecute(
    `INSERT INTO location_profiles (location_id, version, payload, generated_at)
     VALUES ($1, $2, $3, NOW()) ON CONFLICT (location_id, version) DO NOTHING`,
    [locationId, version, JSON.stringify(payload)]
  );
}

export async function closePool(): Promise<void> {
  try {
    if (pool) await pool.end();
  } catch {
  }
}
