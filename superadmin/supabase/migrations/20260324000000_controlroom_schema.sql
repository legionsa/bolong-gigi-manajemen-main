-- DentiCare Control Room Schema
-- Phase 2.1: Superadmin Control Room
-- This schema is isolated in the 'controlroom' namespace

-- =====================================================
-- SCHEMA CREATION
-- =====================================================
CREATE SCHEMA IF NOT EXISTS controlroom;

-- =====================================================
-- SUPERADMIN USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.superadmin_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('viewer', 'operator', 'owner')),
  totp_secret     TEXT,              -- AES-256 encrypted
  totp_enrolled   BOOLEAN DEFAULT FALSE,
  recovery_codes  TEXT[],            -- bcrypt-hashed recovery codes
  is_active       BOOLEAN DEFAULT TRUE,
  is_locked       BOOLEAN DEFAULT FALSE,
  failed_attempts INTEGER DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   INET,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES controlroom.superadmin_users(id)
);

-- =====================================================
-- SUPERADMIN SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.superadmin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id   UUID REFERENCES controlroom.superadmin_users(id) ON DELETE CASCADE NOT NULL,
  session_token   TEXT UNIQUE NOT NULL,   -- hashed
  ip_address      INET,
  user_agent      TEXT,
  country_code    CHAR(2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT
);

-- =====================================================
-- AUDIT LOG (Append-only, immutable)
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.audit_log (
  id              BIGSERIAL PRIMARY KEY,
  actor_type      TEXT NOT NULL,    -- 'superadmin' | 'system' | 'clinic_user'
  actor_id        UUID,
  actor_email     TEXT,
  clinic_id       UUID,             -- null for platform-level actions
  action          TEXT NOT NULL,    -- e.g. USER_DEACTIVATED, API_KEY_VIEWED
  entity_type     TEXT,             -- e.g. 'user', 'clinic', 'api_key'
  entity_id       TEXT,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  user_agent      TEXT,
  severity        TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Disable delete and update on audit_log via RLS (append-only)
ALTER TABLE controlroom.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_delete_on_audit_log" ON controlroom.audit_log FOR DELETE USING (false);
CREATE POLICY "no_update_on_audit_log" ON controlroom.audit_log FOR UPDATE USING (false);
CREATE POLICY "superadmins_can_read_audit_log" ON controlroom.audit_log FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM controlroom.superadmin_users
    WHERE superadmin_users.id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid
    AND superadmin_users.is_active = true
  )
);

-- =====================================================
-- INTEGRATION CREDENTIALS VAULT REFERENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.integration_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL,     -- references public.clinics (when created)
  integration     TEXT NOT NULL CHECK (integration IN ('whatsapp', 'bpjs', 'midtrans', 'otp_sms', 'email')),
  key_name        TEXT NOT NULL,     -- e.g. 'access_token', 'account_sid'
  vault_key_id    TEXT NOT NULL,     -- reference to Supabase Vault secret
  status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  last_verified   TIMESTAMPTZ,
  last_used       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, integration, key_name)
);

-- =====================================================
-- FEATURE FLAGS (Per-clinic overrides)
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID,              -- null = global default
  flag_name       TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL,
  set_by          UUID REFERENCES controlroom.superadmin_users(id),
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, flag_name)
);

-- Global feature flags (clinic_id is null)
INSERT INTO controlroom.feature_flags (flag_name, is_enabled, set_by, reason)
SELECT v.flag_name, v.is_enabled, v.set_by, v.reason
FROM (VALUES
  ('ai_note_generation'::TEXT, FALSE, NULL::UUID, 'Default off, Enterprise only'::TEXT),
  ('telehealth', FALSE, NULL::UUID, 'Default off, Growth+'::TEXT),
  ('bpjs_integration', FALSE, NULL::UUID, 'Default off'::TEXT),
  ('patient_portal', TRUE, NULL::UUID, 'Default on'::TEXT),
  ('online_booking', TRUE, NULL::UUID, 'Default on'::TEXT),
  ('whatsapp_reminders', TRUE, NULL::UUID, 'Default on'::TEXT),
  ('multi_branch', FALSE, NULL::UUID, 'Default off, Enterprise only'::TEXT),
  ('inventory_procurement', FALSE, NULL::UUID, 'Default off, Growth+'::TEXT)
) AS v(flag_name, is_enabled, set_by, reason)
WHERE NOT EXISTS (
  SELECT 1 FROM controlroom.feature_flags f
  WHERE f.clinic_id IS NULL AND f.flag_name = v.flag_name
);

-- =====================================================
-- INCIDENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service         TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  title           TEXT NOT NULL,
  description     TEXT,
  updates         JSONB[] DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES controlroom.superadmin_users(id)
);

-- =====================================================
-- CLINICS (Platform-level registry)
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.clinics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  slug              TEXT UNIQUE NOT NULL,
  city              TEXT,
  province          TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  license_number    TEXT,            -- SIK number
  bpjs_faskes_id    TEXT,
  plan_tier         TEXT DEFAULT 'starter' CHECK (plan_tier IN ('starter', 'growth', 'enterprise')),
  status            TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'suspended', 'churned')),
  trial_ends_at     TIMESTAMPTZ,
  suspended_at      TIMESTAMPTZ,
  suspended_reason  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  activated_at      TIMESTAMPTZ,
  churned_at        TIMESTAMPTZ
);

-- =====================================================
-- PLATFORM ANNOUNCEMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.announcements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message         TEXT NOT NULL,
  type            TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'critical')),
  link            TEXT,
  target_type     TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'specific')),
  target_clinic_ids UUID[],
  is_dismissable  BOOLEAN DEFAULT TRUE,
  is_active       BOOLEAN DEFAULT TRUE,
  scheduled_at    TIMESTAMPTZ,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_by      UUID REFERENCES controlroom.superadmin_users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- OTP SETTINGS (Platform-wide)
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.otp_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                TEXT DEFAULT 'resend' CHECK (provider IN ('twilio', 'zenziva', 'whatsapp', 'resend', 'sendgrid')),
  account_sid             TEXT,
  auth_token_ref          TEXT,      -- Vault reference
  verify_service_sid      TEXT,
  api_key_ref             TEXT,      -- Vault reference
  from_number             TEXT,
  from_email              TEXT DEFAULT 'noreply@denticare.pro',
  from_name               TEXT DEFAULT 'DentiCare Pro',
  reply_to_email          TEXT DEFAULT 'support@denticare.pro',
  code_length             INTEGER DEFAULT 6,
  expiry_seconds          INTEGER DEFAULT 300,
  max_attempts            INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 15,
  resend_cooldown_seconds INTEGER DEFAULT 60,
  channels_priority       TEXT[] DEFAULT ARRAY['whatsapp', 'sms', 'email'],
  is_active               BOOLEAN DEFAULT TRUE,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Default OTP settings
INSERT INTO controlroom.otp_settings (provider, from_email, from_name, reply_to_email) VALUES
  ('resend', 'noreply@denticare.pro', 'DentiCare Pro', 'support@denticare.pro')
ON CONFLICT DO NOTHING;

-- =====================================================
-- RATE LIMITS
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.rate_limits (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration         TEXT NOT NULL,  -- 'sms', 'whatsapp', 'email'
  max_per_day         INTEGER DEFAULT 500,
  max_per_minute      INTEGER DEFAULT 50,
  alert_threshold     DECIMAL DEFAULT 0.8,  -- 80%
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (integration)
);

INSERT INTO controlroom.rate_limits (integration, max_per_day, max_per_minute) VALUES
  ('sms', 500, 50),
  ('whatsapp', 2000, 50),
  ('email', 1000, 50)
ON CONFLICT (integration) DO NOTHING;

-- =====================================================
-- PLAN TIERS
-- =====================================================
CREATE TABLE IF NOT EXISTS controlroom.plan_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  max_users       INTEGER DEFAULT 5,
  max_patients    INTEGER DEFAULT 1000,
  storage_gb      INTEGER DEFAULT 5,
  features        TEXT[] DEFAULT '{}',
  monthly_price   DECIMAL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO controlroom.plan_tiers (name, display_name, max_users, max_patients, storage_gb, features, monthly_price) VALUES
  ('starter', 'Starter', 5, 1000, 5, ARRAY['core_scheduling', 'billing', 'basic_reports', 'whatsapp_reminders'], 299000),
  ('growth', 'Growth', 20, 10000, 25, ARRAY['core_scheduling', 'billing', 'basic_reports', 'whatsapp_reminders', 'bpjs', 'patient_portal', 'online_booking', 'analytics'], 599000),
  ('enterprise', 'Enterprise', NULL, NULL, NULL, ARRAY['all_features'], 1499000)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_superadmin_users_email ON controlroom.superadmin_users(email);
CREATE INDEX IF NOT EXISTS idx_superadmin_users_tier ON controlroom.superadmin_users(tier);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_superadmin_id ON controlroom.superadmin_sessions(superadmin_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_sessions_expires_at ON controlroom.superadmin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON controlroom.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON controlroom.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_clinic_id ON controlroom.audit_log(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON controlroom.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_clinic_id ON controlroom.integration_credentials(clinic_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_clinic_id ON controlroom.feature_flags(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON controlroom.clinics(status);
CREATE INDEX IF NOT EXISTS idx_clinics_plan_tier ON controlroom.clinics(plan_tier);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON controlroom.incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_service ON controlroom.incidents(service);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION controlroom.log_audit_event(
  p_actor_type TEXT,
  p_actor_id UUID,
  p_actor_email TEXT,
  p_clinic_id UUID,
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_before_state JSONB DEFAULT NULL,
  p_after_state JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
) RETURNS BIGINT AS $$
DECLARE
  audit_id BIGINT;
BEGIN
  INSERT INTO controlroom.audit_log (
    actor_type, actor_id, actor_email, clinic_id, action,
    entity_type, entity_id, before_state, after_state,
    ip_address, user_agent, severity
  ) VALUES (
    p_actor_type, p_actor_id, p_actor_email, p_clinic_id, p_action,
    p_entity_type, p_entity_id, p_before_state, p_after_state,
    p_ip_address, p_user_agent, p_severity
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit log entry from trigger
CREATE OR REPLACE FUNCTION controlroom.log_session_event(
  p_session_id UUID,
  p_event_type TEXT,
  p_ip_address INET DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  PERFORM controlroom.log_audit_event(
    p_actor_type => 'superadmin',
    p_actor_id => (SELECT superadmin_id FROM controlroom.superadmin_sessions WHERE id = p_session_id),
    p_actor_email => (SELECT su.email FROM controlroom.superadmin_sessions ss JOIN controlroom.superadmin_users su ON su.id = ss.superadmin_id WHERE ss.id = p_session_id),
    p_action => p_event_type,
    p_entity_type => 'session',
    p_entity_id => p_session_id::TEXT,
    p_ip_address => p_ip_address
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last login
CREATE OR REPLACE FUNCTION controlroom.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE controlroom.superadmin_users
  SET last_login_at = NOW(), last_login_ip = NEW.ip_address
  WHERE id = NEW.superadmin_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session creation (audit)
CREATE OR REPLACE TRIGGER trg_session_created
  AFTER INSERT ON controlroom.superadmin_sessions
  FOR EACH ROW
  EXECUTE FUNCTION controlroom.update_last_login();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Superadmin users - only active superadmins can read, only owners can modify
ALTER TABLE controlroom.superadmin_users ENABLE ROW LEVEL SECURITY;

-- Sessions - users can read their own sessions
ALTER TABLE controlroom.superadmin_sessions ENABLE ROW LEVEL SECURITY;

-- Integration credentials - operators+ can manage
ALTER TABLE controlroom.integration_credentials ENABLE ROW LEVEL SECURITY;

-- Feature flags - operators+ can manage
ALTER TABLE controlroom.feature_flags ENABLE ROW LEVEL SECURITY;

-- Clinics - operators+ can manage
ALTER TABLE controlroom.clinics ENABLE ROW LEVEL SECURITY;

-- Incidents - operators+ can manage
ALTER TABLE controlroom.incidents ENABLE ROW LEVEL SECURITY;

-- Announcements - operators+ can manage
ALTER TABLE controlroom.announcements ENABLE ROW LEVEL SECURITY;

-- OTP settings - owners only
ALTER TABLE controlroom.otp_settings ENABLE ROW LEVEL SECURITY;

-- Rate limits - operators+ can read
ALTER TABLE controlroom.rate_limits ENABLE ROW LEVEL SECURITY;

-- Plan tiers - operators+ can read
ALTER TABLE controlroom.plan_tiers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VIEWS FOR DASHBOARD
-- =====================================================

-- Active clinics count by status
CREATE OR REPLACE VIEW controlroom.v_clinic_stats AS
SELECT
  status,
  COUNT(*) as count
FROM controlroom.clinics
GROUP BY status;

-- Active sessions count
CREATE OR REPLACE VIEW controlroom.v_active_sessions AS
SELECT COUNT(*) as active_count
FROM controlroom.superadmin_sessions
WHERE revoked_at IS NULL
  AND expires_at > NOW();

-- Recent audit events
CREATE OR REPLACE VIEW controlroom.v_recent_audits AS
SELECT
  id,
  created_at,
  actor_email,
  action,
  entity_type,
  entity_id,
  severity,
  ip_address
FROM controlroom.audit_log
ORDER BY created_at DESC
LIMIT 50;
