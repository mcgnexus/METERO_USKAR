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

export function getPoolInstance(): Pool {
  return getPool();
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
CREATE TABLE IF NOT EXISTS station_calibrations (
  station_id TEXT NOT NULL,
  variable TEXT NOT NULL,
  bias FLOAT NOT NULL DEFAULT 0,
  sample_count INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (station_id, variable)
);
CREATE TABLE IF NOT EXISTS station_comparisons (
  id SERIAL PRIMARY KEY,
  station_id TEXT NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  variable TEXT NOT NULL,
  station_value FLOAT,
  reference_value FLOAT,
  error FLOAT,
  absolute_error FLOAT
);
CREATE TABLE IF NOT EXISTS model_validation_daily (
  id SERIAL PRIMARY KEY,
  validation_date DATE NOT NULL,
  source TEXT NOT NULL,
  variable TEXT NOT NULL,
  hour_band TEXT NOT NULL DEFAULT 'all',
  season TEXT NOT NULL DEFAULT 'all',
  mae FLOAT,
  rmse FLOAT,
  bias FLOAT,
  sample_count INT,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (validation_date, source, variable, hour_band, season)
);
CREATE TABLE IF NOT EXISTS model_parameters (
  parameter_key TEXT PRIMARY KEY,
  value FLOAT NOT NULL,
  previous_value FLOAT,
  sample_count INT DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS model_residuals (
  id SERIAL PRIMARY KEY,
  measured_at TIMESTAMPTZ NOT NULL,
  model TEXT NOT NULL,
  estimated_temp_c FLOAT,
  real_temp_c FLOAT,
  residual_c FLOAT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS current_weather_llano (
  location_id TEXT PRIMARY KEY,
  measured_at TIMESTAMPTZ NOT NULL,
  payload JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

// C4 — Devolver también sample_count para que la ponderación Bayesiana en calibrationService
// use el número real de muestras y no el valor hardcodeado (1).
export async function getCalibrationMeasurements(
  daysBack: number
): Promise<{ variable: string; mae: number; sampleCount: number }[]> {
  const rows = await safeQuery(
    `SELECT variable, AVG(absolute_error) AS mae, COUNT(*) AS sample_count
     FROM (
       SELECT variable, absolute_error
       FROM external_calibration_measurements
       WHERE observation_date >= CURRENT_DATE - $1::integer
       UNION ALL
       SELECT variable, absolute_error
       FROM source_measurements
       WHERE snapshot_id >= NOW() - ($1::integer * INTERVAL '1 day')
     ) measurements
     GROUP BY variable`,
    [daysBack]
  );
  return (rows ?? [])
    .map((r: any) => ({
      variable: r.variable,
      mae: Number(r.mae),
      sampleCount: Number(r.sample_count ?? 1),
    }))
    .filter((r) => r.mae > 0);
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

export async function upsertStationCalibration(stationId: string, variable: string, bias: number, sampleCount: number): Promise<void> {
  await safeExecute(
    `INSERT INTO station_calibrations (station_id, variable, bias, sample_count, last_updated)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (station_id, variable) DO UPDATE SET bias = $3, sample_count = $4, last_updated = NOW()`,
    [stationId, variable, bias, sampleCount]
  );
}

export async function getStationCalibrations(stationId: string): Promise<{ variable: string; bias: number; sampleCount: number }[]> {
  const rows = await safeQuery(
    `SELECT variable, bias, sample_count FROM station_calibrations WHERE station_id = $1 AND sample_count >= 5`,
    [stationId]
  );
  return rows.map((r: any) => ({ variable: r.variable, bias: Number(r.bias), sampleCount: Number(r.sample_count) }));
}

export async function getAllStationCalibrations(): Promise<Record<string, { variable: string; bias: number; sampleCount: number }[]>> {
  const rows = await safeQuery(
    `SELECT station_id, variable, bias, sample_count FROM station_calibrations WHERE sample_count >= 5`
  );
  const result: Record<string, any[]> = {};
  for (const r of rows) {
    if (!result[r.station_id]) result[r.station_id] = [];
    result[r.station_id].push({ variable: r.variable, bias: Number(r.bias), sampleCount: Number(r.sample_count) });
  }
  return result;
}

export async function saveStationComparison(
  stationId: string, measuredAt: string, variable: string,
  stationValue: number, referenceValue: number
): Promise<void> {
  const error = stationValue - referenceValue;
  await safeExecute(
    `INSERT INTO station_comparisons (station_id, measured_at, variable, station_value, reference_value, error, absolute_error)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [stationId, measuredAt, variable, stationValue, referenceValue, error, Math.abs(error)]
  );
}

export async function getRecentStationComparisons(stationId: string, variable: string, daysBack: number = 30): Promise<{ error: number; absoluteError: number }[]> {
  const rows = await safeQuery(
    `SELECT error, absolute_error FROM station_comparisons
     WHERE station_id = $1 AND variable = $2 AND measured_at >= NOW() - ($3::integer * INTERVAL '1 day')
     ORDER BY measured_at DESC`,
    [stationId, variable, daysBack]
  );
  return rows.map((r: any) => ({ error: Number(r.error), absoluteError: Number(r.absolute_error) }));
}

export async function closePool(): Promise<void> {
  try {
    if (pool) await pool.end();
  } catch {
  }
}

export interface ValidationRow {
  validationDate: string;
  source: string;
  variable: string;
  hourBand: string;
  season: string;
  mae: number;
  rmse: number;
  bias: number;
  sampleCount: number;
}

export async function saveValidationDaily(row: ValidationRow): Promise<void> {
  await safeExecute(
    `INSERT INTO model_validation_daily
       (validation_date, source, variable, hour_band, season, mae, rmse, bias, sample_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (validation_date, source, variable, hour_band, season)
     DO UPDATE SET mae = $6, rmse = $7, bias = $8, sample_count = $9, computed_at = NOW()`,
    [row.validationDate, row.source, row.variable, row.hourBand, row.season, row.mae, row.rmse, row.bias, row.sampleCount]
  );
}

export async function getValidationHistory(daysBack: number = 30): Promise<ValidationRow[]> {
  const rows = await safeQuery(
    `SELECT validation_date, source, variable, hour_band, season, mae, rmse, bias, sample_count
     FROM model_validation_daily
     WHERE validation_date >= CURRENT_DATE - $1::integer
     ORDER BY validation_date DESC, source, variable`,
    [daysBack]
  );
  return rows.map((r: any) => ({
    validationDate: r.validation_date,
    source: r.source,
    variable: r.variable,
    hourBand: r.hour_band,
    season: r.season,
    mae: Number(r.mae),
    rmse: Number(r.rmse),
    bias: Number(r.bias),
    sampleCount: Number(r.sample_count),
  }));
}

export async function getAggregatedValidation(daysBack: number = 30): Promise<Record<string, any>> {
  const rows = await safeQuery(
    `SELECT
       source, variable, hour_band, season,
       AVG(mae) AS avg_mae,
       AVG(rmse) AS avg_rmse,
       AVG(bias) AS avg_bias,
       SUM(sample_count) AS total_samples
     FROM model_validation_daily
     WHERE validation_date >= CURRENT_DATE - $1::integer
     GROUP BY source, variable, hour_band, season
     ORDER BY source, variable, hour_band`,
    [daysBack]
  );
  const result: any = {};
  for (const r of rows) {
    const key = `${r.source}_${r.variable}_${r.hour_band}_${r.season}`;
    result[key] = {
      source: r.source,
      variable: r.variable,
      hourBand: r.hour_band,
      season: r.season,
      avgMae: Number(r.avg_mae),
      avgRmse: Number(r.avg_rmse),
      avgBias: Number(r.bias !== null ? r.avg_bias : 0),
      totalSamples: Number(r.total_samples ?? 0),
    };
  }
  return result;
}

export async function saveModelParameter(key: string, value: number, sampleCount: number): Promise<void> {
  await safeExecute(
    `INSERT INTO model_parameters (parameter_key, value, previous_value, sample_count, last_updated)
     VALUES ($1, $2, (SELECT value FROM model_parameters WHERE parameter_key = $1), $3, NOW())
     ON CONFLICT (parameter_key) DO UPDATE
     SET previous_value = model_parameters.value,
         value = $2,
         sample_count = $3,
         last_updated = NOW()`,
    [key, value, sampleCount]
  );
}

export async function getModelParameter(key: string): Promise<{ value: number; previousValue: number | null; sampleCount: number } | null> {
  const rows = await safeQuery(
    `SELECT value, previous_value, sample_count FROM model_parameters WHERE parameter_key = $1`,
    [key]
  );
  if (rows.length === 0) return null;
  return {
    value: Number(rows[0].value),
    previousValue: rows[0].previous_value !== null ? Number(rows[0].previous_value) : null,
    sampleCount: Number(rows[0].sample_count ?? 0),
  };
}

export async function getAllModelParameters(): Promise<Record<string, { value: number; previousValue: number | null; sampleCount: number }>> {
  const rows = await safeQuery(
    `SELECT parameter_key, value, previous_value, sample_count FROM model_parameters`
  );
  const result: Record<string, any> = {};
  for (const r of rows) {
    result[r.parameter_key] = {
      value: Number(r.value),
      previousValue: r.previous_value !== null ? Number(r.previous_value) : null,
      sampleCount: Number(r.sample_count ?? 0),
    };
  }
  return result;
}

export async function saveModelResidual(row: {
  measuredAt: string;
  model: string;
  estimatedTempC: number | null;
  realTempC: number | null;
  residualC: number | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  await safeExecute(
    `INSERT INTO model_residuals (measured_at, model, estimated_temp_c, real_temp_c, residual_c, payload)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [row.measuredAt, row.model, row.estimatedTempC, row.realTempC, row.residualC, JSON.stringify(row.payload)]
  );
}

export async function upsertCurrentWeatherLlano(locationId: string, measuredAt: string, payload: Record<string, unknown>): Promise<void> {
  await safeExecute(
    `INSERT INTO current_weather_llano (location_id, measured_at, payload, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (location_id) DO UPDATE SET measured_at = $2, payload = $3, updated_at = NOW()`,
    [locationId, measuredAt, JSON.stringify(payload)]
  );
}
