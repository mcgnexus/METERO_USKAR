import { Pool } from '@neondatabase/serverless';

type QueryParam = string | number | boolean | null;
type QueryRow = Record<string, unknown>;

interface CalibrationMeasurementRow extends QueryRow {
  variable: string;
  mae: number | string;
  sample_count?: number | string | null;
}

interface ComarcaEstimationRow extends QueryRow {
  reference_date: string;
  payload: unknown;
}

interface LocationProfileRow extends QueryRow {
  location_id: string;
  version: string;
  is_active: boolean;
  payload: unknown;
  generated_at: string;
}

interface StationCalibrationRow extends QueryRow {
  station_id?: string;
  variable: string;
  bias: number | string;
  sample_count?: number | string | null;
}

interface StationComparisonRow extends QueryRow {
  error: number | string;
  absolute_error: number | string;
}

interface ValidationRowDb extends QueryRow {
  validation_date: string;
  source: string;
  variable: string;
  hour_band: string;
  season: string;
  mae: number | string;
  rmse: number | string;
  bias: number | string;
  sample_count?: number | string | null;
}

interface AggregatedValidationRow extends QueryRow {
  source: string;
  variable: string;
  hour_band: string;
  season: string;
  avg_mae: number | string;
  avg_rmse: number | string;
  avg_bias: number | string | null;
  total_samples?: number | string | null;
}

interface ModelParameterRow extends QueryRow {
  parameter_key?: string;
  value: number | string;
  previous_value: number | string | null;
  sample_count?: number | string | null;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/postgres' });
  }
  return pool;
}

async function safeQuery<T extends QueryRow = QueryRow>(text: string, params: QueryParam[] = []): Promise<T[]> {
  try {
    const result = await getPool().query(text, params);
    return (result.rows ?? []) as T[];
  } catch {
    return [];
  }
}

async function safeExecute(text: string, params: QueryParam[] = []): Promise<void> {
  try {
    await getPool().query(text, params);
  } catch {
    // Best-effort persistence layer.
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
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT UNIQUE NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS push_notification_log (
  id SERIAL PRIMARY KEY,
  alarm_key TEXT NOT NULL,
  endpoint TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS admin_login_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempt_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS agricultural_leads (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  municipality TEXT NOT NULL,
  crop TEXT NOT NULL,
  area TEXT NOT NULL,
  interests JSONB NOT NULL DEFAULT '[]'::jsonb,
  meteorological_consent BOOLEAN NOT NULL,
  commercial_consent BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS agricultural_leads_created_at_idx ON agricultural_leads (created_at DESC);
CREATE TABLE IF NOT EXISTS lead_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lead_idempotency (
  idem_key TEXT PRIMARY KEY,
  lead_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS lead_consents (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL,
  purpose TEXT NOT NULL,
  granted BOOLEAN NOT NULL,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  policy_version TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lead_consents_lead_id_idx ON lead_consents (lead_id);
CREATE INDEX IF NOT EXISTS lead_consents_purpose_idx ON lead_consents (purpose, revoked_at);
CREATE TABLE IF NOT EXISTS business_events (
  id BIGSERIAL PRIMARY KEY,
  event_name TEXT NOT NULL,
  page TEXT,
  metadata JSONB,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS business_events_created_at_idx ON business_events (created_at DESC);
CREATE INDEX IF NOT EXISTS business_events_event_name_idx ON business_events (event_name);
CREATE TABLE IF NOT EXISTS event_rate_limits (
  client_key TEXT PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE business_events ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE business_events ADD COLUMN IF NOT EXISTS entry_page TEXT;
ALTER TABLE business_events ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS landing_page TEXT DEFAULT '/';
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS notification_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS notification_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS consent_policy_version TEXT NOT NULL DEFAULT '2026-09-v1';
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS ab_variant TEXT;
ALTER TABLE agricultural_leads ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS agricultural_leads_notification_pending_idx
  ON agricultural_leads (created_at ASC)
  WHERE notification_status IN ('new', 'notification_failed');
`;

let initialized = false;

export async function initializeDatabase(): Promise<void> {
  if (initialized) return;
  await safeExecute(CREATE_TABLES_SQL);
  initialized = true;
}

export async function consumeAdminLoginAttempt(
  clientKey: string,
  maxAttempts = 5,
  windowMs = 60_000,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  try {
    const result = await getPool().query(
      `INSERT INTO admin_login_rate_limits (client_key, window_started_at, attempt_count, updated_at)
       VALUES ($1, NOW(), 1, NOW())
       ON CONFLICT (client_key) DO UPDATE SET
         window_started_at = CASE
           WHEN admin_login_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN NOW()
           ELSE admin_login_rate_limits.window_started_at
         END,
         attempt_count = CASE
           WHEN admin_login_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN 1
           ELSE admin_login_rate_limits.attempt_count + 1
         END,
         updated_at = NOW()
       RETURNING attempt_count, window_started_at`,
      [clientKey, windowMs],
    );

    const row = result.rows[0] as { attempt_count?: number | string; window_started_at?: string } | undefined;
    const attemptCount = Number(row?.attempt_count ?? 0);
    const windowStartedAt = row?.window_started_at ? new Date(row.window_started_at).getTime() : Date.now();
    const retryAfterSeconds = Math.max(1, Math.ceil((windowStartedAt + windowMs - Date.now()) / 1000));

    return { allowed: attemptCount <= maxAttempts, retryAfterSeconds };
  } catch {
    // Keep login available if the optional limiter database is temporarily unavailable.
    return { allowed: true, retryAfterSeconds: 0 };
  }
}

export async function consumeLeadAttempt(
  clientKey: string,
  maxAttempts = 3,
  windowMs = 60 * 60_000,
): Promise<boolean> {
  try {
    const result = await getPool().query(
      `INSERT INTO lead_rate_limits (client_key, window_started_at, submission_count, updated_at)
       VALUES ($1, NOW(), 1, NOW())
       ON CONFLICT (client_key) DO UPDATE SET
         window_started_at = CASE
           WHEN lead_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN NOW()
           ELSE lead_rate_limits.window_started_at
         END,
         submission_count = CASE
           WHEN lead_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN 1
           ELSE lead_rate_limits.submission_count + 1
         END,
         updated_at = NOW()
       RETURNING submission_count`,
      [clientKey, windowMs],
    );
    return Number(result.rows[0]?.submission_count ?? 0) <= maxAttempts;
  } catch {
    return false;
  }
}

/** Límite de eventos de analítica por minuto y por cliente. Configurable por entorno. */
function defaultEventRateLimit(): number {
  const raw = process.env.EVENT_RATE_LIMIT_PER_MINUTE;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 600;
}

export async function consumeEventAttempt(
  clientKey: string,
  maxAttempts = defaultEventRateLimit(),
  windowMs = 60_000,
): Promise<boolean> {
  try {
    const result = await getPool().query(
      `INSERT INTO event_rate_limits (client_key, window_started_at, event_count, updated_at)
       VALUES ($1, NOW(), 1, NOW())
       ON CONFLICT (client_key) DO UPDATE SET
         window_started_at = CASE
           WHEN event_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN NOW()
           ELSE event_rate_limits.window_started_at
         END,
         event_count = CASE
           WHEN event_rate_limits.window_started_at <= NOW() - ($2 * INTERVAL '1 millisecond')
           THEN 1
           ELSE event_rate_limits.event_count + 1
         END,
         updated_at = NOW()
       RETURNING event_count`,
      [clientKey, windowMs],
    );
    return Number(result.rows[0]?.event_count ?? 0) <= maxAttempts;
  } catch {
    return false;
  }
}

/**
 * Guarda el lead y devuelve su identificador único (id de la fila).
 * Telegram NUNCA interfiere en el guardado: se llama después de esta función.
 * Devuelve null si la inserción falló.
 */
export async function saveAgriculturalLead(input: {
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  interests: string[];
  meteorologicalConsent: boolean;
  commercialConsent: boolean;
  ipHash: string;
  source?: string;
  landingPage?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  consentPolicyVersion?: string;
  abVariant?: 'A' | 'B' | null;
}): Promise<number | null> {
  try {
    const result = await getPool().query(
      `INSERT INTO agricultural_leads
        (name, phone, municipality, crop, area, interests, meteorological_consent, commercial_consent, ip_hash,
         source, landing_page, utm_source, utm_medium, utm_campaign, consent_policy_version, ab_variant)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      [
        input.name,
        input.phone,
        input.municipality,
        input.crop,
        input.area,
        JSON.stringify(input.interests),
        input.meteorologicalConsent,
        input.commercialConsent,
        input.ipHash,
        input.source ?? 'direct',
        input.landingPage ?? '/',
        input.utmSource ?? null,
        input.utmMedium ?? null,
        input.utmCampaign ?? null,
        input.consentPolicyVersion ?? '2026-09-v1',
        input.abVariant ?? null,
      ],
    );
    const id = result.rows[0]?.id;
    return id != null ? Number(id) : null;
  } catch {
    return null;
  }
}

export type LeadConsentPurpose = 'service_alerts' | 'commercial';

export type LeadConsentInput = {
  purpose: LeadConsentPurpose;
  granted: boolean;
  channels: string[];
};

/**
 * Conserva la EVIDENCIA de la autorización: una fila por finalidad (avisos o
 * comercial) con canales informados, versión de política y fecha. Se graba
 * SIEMPRE, también cuando el usuario NO acepta la comercial, para poder
 * demostrar que se le ofreció por separado y qué respondió.
 */
export async function recordLeadConsents(
  leadId: number,
  consents: LeadConsentInput[],
  policyVersion: string,
): Promise<void> {
  try {
    for (const consent of consents) {
      await getPool().query(
        `INSERT INTO lead_consents (lead_id, purpose, granted, channels, policy_version)
         VALUES ($1, $2, $3, $4::jsonb, $5)`,
        [leadId, consent.purpose, consent.granted, JSON.stringify(consent.channels), policyVersion],
      );
    }
  } catch {
    // El lead ya está guardado; la falta de evidencia se registra en logs.
    console.error(`[weatherStore] No se pudo registrar evidencia de consentimiento para lead ${leadId}`);
  }
}

/**
 * Retirada de consentimiento por finalidad: marca revoked_at en la evidencia
 * y sincroniza el flag resumen del lead. Devuelve true si se retiró algo.
 */
export async function withdrawLeadConsent(phone: string, purpose: LeadConsentPurpose): Promise<boolean> {
  try {
    const flagColumn = purpose === 'commercial' ? 'commercial_consent' : 'meteorological_consent';
    const result = await getPool().query(
      `UPDATE lead_consents lc SET revoked_at = NOW()
       FROM agricultural_leads al
       WHERE lc.lead_id = al.id AND al.phone = $1 AND lc.purpose = $2 AND lc.revoked_at IS NULL`,
      [phone, purpose],
    );
    await getPool().query(
      `UPDATE agricultural_leads SET ${flagColumn} = false WHERE phone = $1`,
      [phone],
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Registra el resultado del intento de notificación Telegram de un lead.
 * Estados: 'new' (sin intentar) → 'notified' | 'notification_failed'.
 */
export async function setLeadNotificationStatus(
  leadId: number,
  status: 'notified' | 'notification_failed',
): Promise<void> {
  try {
    await getPool().query(
      `UPDATE agricultural_leads SET
         notification_status = $2,
         notified_at = CASE WHEN $2 = 'notified' THEN NOW() ELSE notified_at END,
         notification_attempts = notification_attempts + 1
       WHERE id = $1`,
      [leadId, status],
    );
  } catch (err) {
    console.error('[weatherStore] No se pudo registrar el estado de notificación del lead:', err instanceof Error ? err.message : err);
  }
}

/**
 * Marca un lead como "respondido" (la conversación de WhatsApp/Telegram avanzó
 * o el aviso resultó útil). Actualiza el status del lead y registra el evento
 * canónico 'lead_responded' con municipio y campaña UTM, para que el embudo de
 * conversión pueda medir el último paso (respuesta) con los mismos filtros que
 * el resto. Devuelve false si el lead no existe o ya estaba responded.
 */
export async function markLeadResponded(
  leadId: number,
): Promise<{ ok: boolean; municipality?: string | null; utmCampaign?: string | null }> {
  try {
    const result = await getPool().query(
      `UPDATE agricultural_leads
          SET status = 'responded', responded_at = NOW()
        WHERE id = $1
          AND status <> 'responded'
        RETURNING id, municipality, utm_campaign`,
      [leadId],
    );
    const row = result.rows[0];
    if (!row) return { ok: false };
    await recordBusinessEvent({
      event: 'lead_responded',
      metadata: {
        lead_id: String(row.id),
        municipality: row.municipality,
        utm_campaign: row.utm_campaign,
      },
    });
    return { ok: true, municipality: row.municipality, utmCampaign: row.utm_campaign };
  } catch {
    return { ok: false };
  }
}

export interface LeadPendingNotification {
  id: number;
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  interests: string[];
  attempts: number;
}

/**
 * Leads pendientes de notificar: 'new' (nunca intentado, p. ej. faltaban env
 * vars) o 'notification_failed' (Telegram falló). Solo de los últimos 7 días
 * y con menos de 5 intentos, para no perseguir leads antiguos para siempre.
 */
export async function findLeadsPendingNotification(limit = 20): Promise<LeadPendingNotification[]> {
  try {
    const result = await getPool().query(
      `SELECT id, name, phone, municipality, crop, area, interests, notification_attempts
       FROM agricultural_leads
       WHERE notification_status IN ('new', 'notification_failed')
         AND notification_attempts < 5
         AND created_at > NOW() - INTERVAL '7 days'
       ORDER BY created_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      id: Number(row.id),
      name: row.name ?? '',
      phone: row.phone ?? '',
      municipality: row.municipality ?? '',
      crop: row.crop ?? '',
      area: row.area ?? '',
      interests: Array.isArray(row.interests) ? row.interests : [],
      attempts: Number(row.notification_attempts ?? 0),
    }));
  } catch {
    return [];
  }
}

export async function purgeExpiredAgriculturalLeads(): Promise<void> {
  try {
    await getPool().query(
      `DELETE FROM agricultural_leads
       WHERE created_at < NOW() - INTERVAL '12 months'`,
    );
  } catch {
    // Retention cleanup must not prevent the weather capture cron from running.
  }
}

export async function findRecentLead(phone: string, municipality: string, withinDays = 7): Promise<boolean> {
  try {
    const result = await getPool().query(
      `SELECT 1 FROM agricultural_leads
       WHERE phone = $1 AND municipality = $2
         AND created_at > NOW() - ($3 || ' days')::INTERVAL
       LIMIT 1`,
      [phone, municipality, withinDays],
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

/** Ventana (minutos) en la que un segundo envío del mismo teléfono se trata como duplicado. */
export const LEAD_DUPLICATE_PHONE_WINDOW_MINUTES = 30;

/** Envío del mismo teléfono en los últimos N minutos → duplicado, sea cual sea el resto del formulario. */
export async function findRecentLeadWithinMinutes(phone: string, withinMinutes = LEAD_DUPLICATE_PHONE_WINDOW_MINUTES): Promise<boolean> {
  try {
    const result = await getPool().query(
      `SELECT 1 FROM agricultural_leads
       WHERE phone = $1
         AND created_at > NOW() - ($2 || ' minutes')::INTERVAL
       LIMIT 1`,
      [phone, withinMinutes],
    );
    return (result.rowCount ?? 0) > 0;
  } catch {
    return false;
  }
}

export type LeadIdempotencyClaim = 'new' | 'exists' | 'error';

/**
 * Reclama una clave de idempotencia: solo la PRIMERA petición con esa clave
 * obtiene 'new'; cualquier repetición (doble clic, reintento de red) recibe
 * 'exists' y no vuelve a insertar ni a notificar.
 */
export async function claimLeadIdempotencyKey(idemKey: string): Promise<LeadIdempotencyClaim> {
  try {
    await getPool().query(
      `DELETE FROM lead_idempotency WHERE created_at < NOW() - INTERVAL '48 hours'`,
    );
    const result = await getPool().query(
      `INSERT INTO lead_idempotency (idem_key) VALUES ($1)
       ON CONFLICT (idem_key) DO NOTHING
       RETURNING idem_key`,
      [idemKey],
    );
    return (result.rowCount ?? 0) > 0 ? 'new' : 'exists';
  } catch {
    // Sin idempotencia disponible se sigue con el resto de protecciones.
    return 'error';
  }
}

/** Asocia el lead guardado a la clave de idempotencia reclamada. */
export async function attachLeadIdempotencyLead(idemKey: string, leadId: number): Promise<void> {
  try {
    await getPool().query(`UPDATE lead_idempotency SET lead_id = $2 WHERE idem_key = $1`, [idemKey, leadId]);
  } catch {
    // La clave caduca sola en 48 h; el lead ya está guardado.
  }
}

/**
 * Libera una clave reclamada cuyo lead NO llegó a guardarse, para que un
 * reintento legítimo con la misma clave pueda volver a intentarlo.
 */
export async function releaseLeadIdempotencyKey(idemKey: string): Promise<void> {
  try {
    await getPool().query(`DELETE FROM lead_idempotency WHERE idem_key = $1 AND lead_id IS NULL`, [idemKey]);
  } catch {
    // Si falla, la clave caduca sola; no bloquea el flujo.
  }
}

export type RecentLead = {
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  interests: string[];
  source: string;
  createdAt: string;
};

export async function getRecentLeads(limit = 5): Promise<RecentLead[]> {
  try {
    const result = await getPool().query(
      `SELECT name, phone, municipality, crop, area, interests, source, created_at
       FROM agricultural_leads
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      name: row.name ?? '',
      phone: row.phone ?? '',
      municipality: row.municipality ?? '',
      crop: row.crop ?? '',
      area: row.area ?? '',
      interests: Array.isArray(row.interests) ? row.interests : [],
      source: row.source ?? 'direct',
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function getRecentAgriculturalLeads(limit = 50): Promise<Array<{
  id: number | string;
  name: string;
  phone: string;
  municipality: string;
  crop: string;
  area: string;
  interests: string[];
  meteorological_consent: boolean;
  commercial_consent: boolean;
  consented_at: string;
  status: string;
  source: string;
  landing_page: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  created_at: string;
}>> {
  const rows = await safeQuery<{
    id: number | string;
    name: string;
    phone: string;
    municipality: string;
    crop: string;
    area: string;
    interests: string[] | null;
    meteorological_consent: boolean;
    commercial_consent: boolean;
    consented_at: string;
    status: string;
    source: string;
    landing_page: string;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    created_at: string;
  }>(
    `SELECT id, name, phone, municipality, crop, area, interests,
            meteorological_consent, commercial_consent, consented_at, status,
            source, landing_page, utm_source, utm_medium, utm_campaign, created_at
       FROM agricultural_leads
      ORDER BY created_at DESC
      LIMIT $1`,
    [Math.min(Math.max(limit, 1), 100)],
  );
  return rows.map((row) => ({ ...row, interests: Array.isArray(row.interests) ? row.interests : [] }));
}

export interface AbTestMetric {
  assigned: number;
  started: number;
  leads: number;
  startRate: number;
  abandonmentRate: number;
  leadRate: number;
}

export type AbTestReport = Record<'A' | 'B', AbTestMetric>;

function emptyAbMetric(): AbTestMetric {
  return { assigned: 0, started: 0, leads: 0, startRate: 0, abandonmentRate: 0, leadRate: 0 };
}

/**
 * Cuenta por variante (A: WhatsApp 1 clic, B: formulario mínimo) los eventos del
 * embudo de captación y los leads reales guardados con ab_variant. Se compara
 * el mismo período: evento ab_test_assigned (asignación) contra leads con la
 * variante en agricultural_leads.ab_variant.
 */
export async function getAbTestMetrics(daysBack = 60): Promise<AbTestReport> {
  const report: AbTestReport = { A: emptyAbMetric(), B: emptyAbMetric() };
  try {
    const events = await safeQuery<{ variant: string | null; event_name: string; total: number }>(
      `SELECT metadata->>'variant' AS variant, event_name,
              COUNT(*)::int AS total
         FROM business_events
        WHERE event_name IN ('ab_test_assigned','lead_form_started','lead_form_start','whatsapp_click','lead_form_success')
          AND metadata->>'variant' IN ('A','B')
          AND created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY 1, 2`,
      [String(Math.max(1, Math.min(daysBack, 365)))],
    );
    for (const event of events) {
      const variant = event.variant as 'A' | 'B';
      if (!report[variant]) continue;
      if (event.event_name === 'ab_test_assigned') report[variant].assigned = event.total;
      else if (event.event_name === 'whatsapp_click' || event.event_name === 'lead_form_started' || event.event_name === 'lead_form_start') {
        report[variant].started += event.total;
      } else if (event.event_name === 'lead_form_success') {
        report[variant].leads += event.total;
      }
    }

    const leads = await safeQuery<{ ab_variant: string | null; total: number }>(
      `SELECT ab_variant, COUNT(*)::int AS total
         FROM agricultural_leads
        WHERE ab_variant IN ('A','B')
          AND created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY 1`,
      [String(Math.max(1, Math.min(daysBack, 365)))],
    );
    for (const lead of leads) {
      const variant = lead.ab_variant as 'A' | 'B';
      if (!report[variant]) continue;
      report[variant].leads = Math.max(report[variant].leads, lead.total);
    }

    for (const variant of ['A', 'B'] as const) {
      const metric = report[variant];
      metric.startRate = metric.assigned > 0 ? metric.started / metric.assigned : 0;
      metric.abandonmentRate = metric.started > 0 ? 1 - metric.leads / metric.started : 0;
      metric.leadRate = metric.assigned > 0 ? metric.leads / metric.assigned : 0;
    }
  } catch {
    /* métricas no disponibles */
  }
  return report;
}

export interface FunnelStep {
  key: string;
  label: string;
  emoji: string;
  count: number;
  /** Conversión respecto al paso inmediatamente anterior (el primero = 100). */
  conversionPct: number;
}

export interface FunnelReport {
  daysBack: number;
  municipality: string | null;
  utmCampaign: string | null;
  steps: FunnelStep[];
  /** Valores distintos disponibles para filtrar (municipios y campañas UTM). */
  municipalities: string[];
  campaigns: string[];
  hasData: boolean;
}

/** Pasos del embudo de captación: visita → CTA → form iniciado → completado → lead → WhatsApp → respuesta. */
const FUNNEL_STEPS: Array<{ key: string; label: string; emoji: string; events: string[] }> = [
  { key: 'visits', label: 'Visitas', emoji: '👀', events: ['weather_view', 'field_page_viewed', 'alerts_page_viewed'] },
  { key: 'cta', label: 'CTA', emoji: '👆', events: ['lead_cta_click', 'cta_clicked'] },
  { key: 'form_started', label: 'Form iniciado', emoji: '✍️', events: ['lead_form_start', 'lead_form_started'] },
  { key: 'form_completed', label: 'Form completado', emoji: '📝', events: ['lead_form_submit', 'lead_form_submitted'] },
  { key: 'lead_valid', label: 'Lead válido', emoji: '🎯', events: ['lead_form_success', 'lead_qualified'] },
  { key: 'whatsapp', label: 'WhatsApp iniciado', emoji: '💬', events: ['whatsapp_click', 'whatsapp_clicked'] },
  { key: 'responded', label: 'Respuesta', emoji: '📞', events: ['lead_responded'] },
];

/**
 * Embudo completo de captación agregado desde los eventos canónicos + legacy,
 * con filtros opcionales por municipio (metadata) y campaña UTM. El paso "lead
 * válido" cruza los eventos de éxito con los leads realmente guardados en BD
 * (cubre formularios que no emiten lead_form_success, p. ej. /contacto).
 */
export async function getFunnelMetrics(options?: {
  daysBack?: number;
  municipality?: string;
  utmCampaign?: string;
}): Promise<FunnelReport> {
  const daysBack = Math.max(7, Math.min(365, options?.daysBack ?? 30));
  const municipality = options?.municipality?.trim().slice(0, 100) || null;
  const utmCampaign = options?.utmCampaign?.trim().slice(0, 100) || null;

  const empty = (): FunnelReport => ({
    daysBack,
    municipality,
    utmCampaign,
    steps: FUNNEL_STEPS.map((s) => ({ key: s.key, label: s.label, emoji: s.emoji, count: 0, conversionPct: 0 })),
    municipalities: [],
    campaigns: [],
    hasData: false,
  });

  try {
    const rows = await safeQuery<{ event_name: string; municipality: string | null; campaign: string | null; total: number }>(
      `SELECT event_name,
              metadata->>'municipality' AS municipality,
              COALESCE(NULLIF(metadata->>'utm_campaign', ''), utm_campaign) AS campaign,
              COUNT(*)::int AS total
         FROM business_events
        WHERE created_at >= NOW() - ($1 || ' days')::interval
        GROUP BY 1, 2, 3`,
      [String(daysBack)],
    );

    let filtered = rows;
    if (municipality) filtered = filtered.filter((r) => r.municipality === municipality);
    if (utmCampaign) filtered = filtered.filter((r) => r.campaign === utmCampaign);

    const sumEvents = (events: string[]): number =>
      filtered.filter((r) => events.includes(r.event_name)).reduce((acc, r) => acc + r.total, 0);

    const counts = new Map<string, number>();
    for (const step of FUNNEL_STEPS) counts.set(step.key, sumEvents(step.events));

    // Cruce con leads reales guardados en BD (mismo período y filtros).
    const leadConds: string[] = [`created_at >= NOW() - ($1 || ' days')::interval`];
    const leadParams: Array<string | number> = [String(daysBack)];
    if (municipality) {
      leadParams.push(municipality);
      leadConds.push(`municipality = $${leadParams.length}`);
    }
    if (utmCampaign) {
      leadParams.push(utmCampaign);
      leadConds.push(`utm_campaign = $${leadParams.length}`);
    }
    const stored = await safeQuery<{ total: number }>(
      `SELECT COUNT(*)::int AS total
         FROM agricultural_leads
        WHERE ${leadConds.join(' AND ')}`,
      leadParams,
    );
    const storedTotal = stored.reduce((acc, r) => acc + r.total, 0);
    counts.set('lead_valid', Math.max(counts.get('lead_valid') ?? 0, storedTotal));

    if (rows.length === 0 && storedTotal === 0) return empty();

    // Valores disponibles para los filtros del panel.
    const municipalitySet = new Set<string>();
    const campaignSet = new Set<string>();
    for (const r of rows) {
      if (r.municipality) municipalitySet.add(r.municipality);
      if (r.campaign) campaignSet.add(r.campaign);
    }
    if (!municipality && !utmCampaign) {
      const extra = await safeQuery<{ municipality: string | null }>(
        `SELECT DISTINCT municipality AS municipality FROM agricultural_leads
          WHERE created_at >= NOW() - ($1 || ' days')::interval AND municipality IS NOT NULL
          LIMIT 60`,
        [String(daysBack)],
      ).catch(() => []);
      for (const r of extra) if (r.municipality) municipalitySet.add(r.municipality);
      const extraCampaigns = await safeQuery<{ utm_campaign: string | null }>(
        `SELECT DISTINCT utm_campaign AS utm_campaign FROM agricultural_leads
          WHERE created_at >= NOW() - ($1 || ' days')::interval AND utm_campaign IS NOT NULL
          LIMIT 60`,
        [String(daysBack)],
      ).catch(() => []);
      for (const r of extraCampaigns) if (r.utm_campaign) campaignSet.add(r.utm_campaign);
    }

    const steps: FunnelStep[] = FUNNEL_STEPS.map((s, index) => {
      const count = counts.get(s.key) ?? 0;
      const prev = counts.get(FUNNEL_STEPS[index - 1]?.key) ?? 0;
      const conversionPct = index === 0 ? 100 : prev > 0 ? (count / prev) * 100 : 0;
      return { key: s.key, label: s.label, emoji: s.emoji, count, conversionPct };
    });

    const municipalities = [...municipalitySet].sort((a, b) => a.localeCompare(b, 'es')).slice(0, 30);
    const campaigns = [...campaignSet].sort((a, b) => a.localeCompare(b, 'es')).slice(0, 30);

    return {
      daysBack,
      municipality,
      utmCampaign,
      steps,
      municipalities,
      campaigns,
      hasData: rows.length > 0 || storedTotal > 0,
    };
  } catch {
    return empty();
  }
}

const VALID_EVENTS = new Set([
  'weather_view',
  'push_prompt_shown',
  'push_submitted',
  'push_subscribed',
  'lead_form_opened',
  'lead_form_started',
  'lead_form_submitted',
  'whatsapp_clicked',
  'daily_card_shared',
  'daily_card_downloaded',
  'form_step_1_completed',
  'form_step_2_completed',
  'lead_qualified',
  'cta_clicked',
  'whatsapp_cta_clicked',
  'whatsapp_contact_clicked',
  'field_page_viewed',
  'alerts_page_viewed',
  'field_navigation_clicked',
  'alerts_navigation_clicked',
  'sources_navigation_clicked',
  // Nombres canónicos del embudo de conversión (spec analítica).
  'lead_cta_click',
  'lead_form_open',
  'lead_form_start',
  'lead_form_error',
  'lead_form_submit',
  'lead_form_success',
  'whatsapp_click',
  'ab_test_assigned',
  'lead_responded',
]);

export async function recordBusinessEvent(input: {
  event: string;
  page?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
  deviceType?: string;
  entryPage?: string;
  utmCampaign?: string;
}): Promise<boolean> {
  if (!VALID_EVENTS.has(input.event)) return false;
  try {
    await getPool().query(
      `INSERT INTO business_events (event_name, page, metadata, ip_hash, device_type, entry_page, utm_campaign)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)`,
      [
        input.event,
        input.page ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        input.ipHash ?? null,
        input.deviceType ?? null,
        input.entryPage ?? null,
        input.utmCampaign ?? null,
      ],
    );
    return true;
  } catch {
    return false;
  }
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
  const rows = await safeQuery<{ observation?: Record<string, unknown> }>(
    `SELECT observation FROM latest_source_observations WHERE source = $1`,
    [source]
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

export async function getCalibrationMeasurements(
  daysBack: number
): Promise<{ variable: string; mae: number; sampleCount: number }[]> {
  const rows = await safeQuery<CalibrationMeasurementRow>(
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

  return rows
    .map((row) => ({
      variable: row.variable,
      mae: Number(row.mae),
      sampleCount: Number(row.sample_count ?? 1),
    }))
    .filter((row) => row.mae > 0);
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

export async function getComarcaEstimations(): Promise<{ reference_date: string; payload: unknown } | null> {
  const rows = await safeQuery<ComarcaEstimationRow>(
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

export async function getLocationProfiles(locationId: string): Promise<LocationProfileRow | null> {
  const rows = await safeQuery<LocationProfileRow>(
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
  const rows = await safeQuery<StationCalibrationRow>(
    `SELECT variable, bias, sample_count FROM station_calibrations WHERE station_id = $1 AND sample_count >= 5`,
    [stationId]
  );
  return rows.map((row) => ({
    variable: row.variable,
    bias: Number(row.bias),
    sampleCount: Number(row.sample_count ?? 0),
  }));
}

export async function getAllStationCalibrations(): Promise<Record<string, { variable: string; bias: number; sampleCount: number }[]>> {
  const rows = await safeQuery<StationCalibrationRow>(
    `SELECT station_id, variable, bias, sample_count FROM station_calibrations WHERE sample_count >= 5`
  );
  const result: Record<string, { variable: string; bias: number; sampleCount: number }[]> = {};

  for (const row of rows) {
    if (!row.station_id) continue;
    if (!result[row.station_id]) result[row.station_id] = [];
    result[row.station_id].push({
      variable: row.variable,
      bias: Number(row.bias),
      sampleCount: Number(row.sample_count ?? 0),
    });
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
  const rows = await safeQuery<StationComparisonRow>(
    `SELECT error, absolute_error FROM station_comparisons
     WHERE station_id = $1 AND variable = $2 AND measured_at >= NOW() - ($3::integer * INTERVAL '1 day')
     ORDER BY measured_at DESC`,
    [stationId, variable, daysBack]
  );
  return rows.map((row) => ({ error: Number(row.error), absoluteError: Number(row.absolute_error) }));
}

export async function closePool(): Promise<void> {
  try {
    if (pool) await pool.end();
  } catch {
    // Ignore shutdown errors.
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
  const rows = await safeQuery<ValidationRowDb>(
    `SELECT validation_date, source, variable, hour_band, season, mae, rmse, bias, sample_count
     FROM model_validation_daily
     WHERE validation_date >= CURRENT_DATE - $1::integer
     ORDER BY validation_date DESC, source, variable`,
    [daysBack]
  );
  return rows.map((row) => ({
    validationDate: row.validation_date,
    source: row.source,
    variable: row.variable,
    hourBand: row.hour_band,
    season: row.season,
    mae: Number(row.mae),
    rmse: Number(row.rmse),
    bias: Number(row.bias),
    sampleCount: Number(row.sample_count ?? 0),
  }));
}

export interface AggregatedValidationSummary {
  source: string;
  variable: string;
  hourBand: string;
  season: string;
  avgMae: number;
  avgRmse: number;
  avgBias: number;
  totalSamples: number;
}

export async function getAggregatedValidation(daysBack: number = 30): Promise<Record<string, AggregatedValidationSummary>> {
  const rows = await safeQuery<AggregatedValidationRow>(
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
  const result: Record<string, AggregatedValidationSummary> = {};

  for (const row of rows) {
    const key = `${row.source}_${row.variable}_${row.hour_band}_${row.season}`;
    result[key] = {
      source: row.source,
      variable: row.variable,
      hourBand: row.hour_band,
      season: row.season,
      avgMae: Number(row.avg_mae),
      avgRmse: Number(row.avg_rmse),
      avgBias: Number(row.avg_bias ?? 0),
      totalSamples: Number(row.total_samples ?? 0),
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
  const rows = await safeQuery<ModelParameterRow>(
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
  const rows = await safeQuery<ModelParameterRow>(
    `SELECT parameter_key, value, previous_value, sample_count FROM model_parameters`
  );
  const result: Record<string, { value: number; previousValue: number | null; sampleCount: number }> = {};

  for (const row of rows) {
    if (!row.parameter_key) continue;
    result[row.parameter_key] = {
      value: Number(row.value),
      previousValue: row.previous_value !== null ? Number(row.previous_value) : null,
      sampleCount: Number(row.sample_count ?? 0),
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

export async function savePushSubscription(endpoint: string, keysP256dh: string, keysAuth: string): Promise<void> {
  await safeExecute(
    `INSERT INTO push_subscriptions (endpoint, keys_p256dh, keys_auth)
     VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO NOTHING`,
    [endpoint, keysP256dh, keysAuth]
  );
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await safeExecute(
    `DELETE FROM push_subscriptions WHERE endpoint = $1`,
    [endpoint]
  );
}

export async function getPushSubscriptions(): Promise<{ endpoint: string; keys_p256dh: string; keys_auth: string }[]> {
  const rows = await safeQuery(
    `SELECT endpoint, keys_p256dh, keys_auth FROM push_subscriptions ORDER BY created_at DESC`,
    []
  );
  return rows as { endpoint: string; keys_p256dh: string; keys_auth: string }[];
}

export async function hasNotificationBeenSent(alarmKey: string, withinMinutes = 60): Promise<boolean> {
  const rows = await safeQuery(
    `SELECT 1 FROM push_notification_log
     WHERE alarm_key = $1 AND sent_at > NOW() - INTERVAL '${withinMinutes} minutes'
     LIMIT 1`,
    [alarmKey]
  );
  return rows.length > 0;
}

export async function logNotificationSent(alarmKey: string, endpoint: string | null): Promise<void> {
  await safeExecute(
    `INSERT INTO push_notification_log (alarm_key, endpoint) VALUES ($1, $2)`,
    [alarmKey, endpoint]
  );
}
