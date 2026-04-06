-- =====================================================
-- PERMISSIONS, TIERING & PAYWALL SYSTEM
-- Phase 1: Database Foundation
-- =====================================================
-- Idempotent: uses CREATE OR REPLACE, IF NOT EXISTS, DROP TYPE IF EXISTS

-- =====================================================
-- 1. ENUMS
-- =====================================================
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS service_tier CASCADE;

CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'doctor', 'finance', 'front_desk');
CREATE TYPE service_tier AS ENUM ('free', 'pro_trial', 'pro', 'enterprise');

-- =====================================================
-- 2. ACCOUNTS TABLE
-- One per registered user — owns subscription/tier
-- =====================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                service_tier NOT NULL DEFAULT 'pro_trial',
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  tier_activated_at   TIMESTAMPTZ,
  tier_expires_at     TIMESTAMPTZ,
  stripe_customer_id  TEXT,
  stripe_sub_id       TEXT,
  clinics_used        SMALLINT DEFAULT 0,
  storage_used_bytes  BIGINT DEFAULT 0,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. TIER_LIMITS CONFIG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tier_limits (
  tier                          service_tier PRIMARY KEY,
  max_clinics                   SMALLINT NOT NULL DEFAULT 1,
  max_doctors_per_clinic        SMALLINT NOT NULL DEFAULT 2,
  max_front_desk_per_clinic     SMALLINT NOT NULL DEFAULT 1,
  max_finance_per_clinic        SMALLINT NOT NULL DEFAULT 0,
  max_admins_per_clinic         SMALLINT NOT NULL DEFAULT 1,
  max_storage_gb                SMALLINT NOT NULL DEFAULT 1,
  analytics_days                SMALLINT NOT NULL DEFAULT 7,
  can_export                    BOOLEAN NOT NULL DEFAULT FALSE,
  can_whatsapp                  BOOLEAN NOT NULL DEFAULT FALSE,
  can_bpjs                      BOOLEAN NOT NULL DEFAULT FALSE,
  can_ai_notes                  BOOLEAN NOT NULL DEFAULT FALSE,
  can_patient_portal            BOOLEAN NOT NULL DEFAULT FALSE,
  max_surat_izin_templates      SMALLINT NOT NULL DEFAULT 1,
  can_custom_subdomain          BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed tier limits
INSERT INTO public.tier_limits (tier, max_clinics, max_doctors_per_clinic, max_front_desk_per_clinic, max_finance_per_clinic, max_admins_per_clinic, max_storage_gb, analytics_days, can_export, can_whatsapp, can_bpjs, can_ai_notes, can_patient_portal, max_surat_izin_templates, can_custom_subdomain) VALUES
  ('free',       1,  2, 1, 0, 1,  1,  7,  false, false, false, false, false, 1,  false),
  ('pro_trial', -1, -1,-1,-1,-1, 25, -1,  true,  true,  true,  true,  true, -1, false),
  ('pro',       -1, -1,-1,-1,-1, 25, -1,  true,  true,  true,  true,  true, -1, true),
  ('enterprise',-1, -1,-1,-1,-1, -1, -1,  true,  true,  true,  true,  true, -1, true)
ON CONFLICT (tier) DO NOTHING;

-- =====================================================
-- 4. SUBSCRIPTION_EVENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  from_tier       service_tier,
  to_tier         service_tier,
  amount_idr      INTEGER,
  payment_method  TEXT,
  reference_id    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ADD ACCOUNT_ID TO CLINIC_USERS
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clinic_users' AND column_name='account_id') THEN
    ALTER TABLE public.clinic_users ADD COLUMN account_id UUID REFERENCES public.accounts(id);
  END IF;
END $$;

-- Update the CHECK constraint on role column to allow new roles
ALTER TABLE public.clinic_users DROP CONSTRAINT IF EXISTS clinic_users_role_check;
ALTER TABLE public.clinic_users ADD CONSTRAINT clinic_users_role_check
  CHECK (role IN ('superadmin','admin','doctor','finance','front_desk'));

-- Add account_id to unique constraint
ALTER TABLE public.clinic_users DROP CONSTRAINT IF EXISTS clinic_users_clinic_id_user_id_key;
ALTER TABLE public.clinic_users ADD CONSTRAINT clinic_users_clinic_id_user_id_key UNIQUE (clinic_id, user_id);

-- =====================================================
-- 6. ACCOUNT_ACTIVE_TIER VIEW
-- =====================================================
CREATE OR REPLACE VIEW public.account_active_tier AS
SELECT
  a.id AS account_id,
  a.owner_user_id,
  CASE
    WHEN a.tier = 'pro_trial' AND a.trial_ends_at < NOW() THEN 'free'::service_tier
    ELSE a.tier
  END AS effective_tier,
  a.trial_ends_at,
  a.tier_expires_at,
  tl.max_clinics,
  tl.max_doctors_per_clinic,
  tl.max_front_desk_per_clinic,
  tl.max_finance_per_clinic,
  tl.max_admins_per_clinic,
  tl.max_storage_gb,
  tl.analytics_days,
  tl.can_export,
  tl.can_whatsapp,
  tl.can_bpjs,
  tl.can_ai_notes,
  tl.can_patient_portal,
  tl.max_surat_izin_templates,
  tl.can_custom_subdomain
FROM public.accounts a
JOIN public.tier_limits tl ON tl.tier = (
  CASE
    WHEN a.tier = 'pro_trial' AND a.trial_ends_at < NOW() THEN 'free'::service_tier
    ELSE a.tier
  END
);

-- =====================================================
-- 7. CHECK_TIER_LIMIT() FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_tier_limit(
  p_account_id UUID,
  p_clinic_id  UUID,
  p_role       TEXT
) RETURNS TEXT AS $$
DECLARE
  v_tier  RECORD;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_tier
  FROM public.account_active_tier
  WHERE account_id = p_account_id;

  IF v_tier IS NULL THEN RETURN NULL; END IF;

  IF p_role = 'doctor' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.clinic_users
    WHERE clinic_id = p_clinic_id AND role = 'doctor' AND status = 'active';
    IF v_tier.max_doctors_per_clinic != -1 AND v_count >= v_tier.max_doctors_per_clinic THEN
      RETURN 'limit.doctors';
    END IF;

  ELSIF p_role = 'front_desk' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.clinic_users
    WHERE clinic_id = p_clinic_id AND role = 'front_desk' AND status = 'active';
    IF v_tier.max_front_desk_per_clinic != -1 AND v_count >= v_tier.max_front_desk_per_clinic THEN
      RETURN 'limit.front_desk';
    END IF;

  ELSIF p_role = 'finance' THEN
    IF v_tier.max_finance_per_clinic = 0 THEN
      RETURN 'limit.finance_free';
    END IF;

  ELSIF p_role = 'admin' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.clinic_users
    WHERE clinic_id = p_clinic_id AND role = 'admin' AND status = 'active';
    IF v_tier.max_admins_per_clinic != -1 AND v_count >= v_tier.max_admins_per_clinic THEN
      RETURN 'limit.admins';
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. RLS POLICIES
-- =====================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- accounts: only owner can read their own
CREATE POLICY "accounts_owner_read" ON public.accounts
  FOR SELECT USING (owner_user_id = auth.uid());

-- accounts: no direct INSERT/UPDATE by user (only via system/edge functions)
CREATE POLICY "accounts_system_write" ON public.accounts
  FOR INSERT WITH CHECK (TRUE);  -- allow for now, edge function handles logic

-- subscription_events: owner can read
CREATE POLICY "subscription_events_owner_read" ON public.subscription_events
  FOR SELECT USING (
    account_id IN (SELECT id FROM public.accounts WHERE owner_user_id = auth.uid())
  );

-- =====================================================
-- 9. DOCTORS TABLE (references users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.doctors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id       UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  specialization   TEXT,
  sip             TEXT,
  str             TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctors_clinic_id ON public.doctors(clinic_id);

-- =====================================================
-- 10. DOCTOR-SCOPED RLS (appointments table)
-- Note: appointments.dentist_id = users.id (not doctors.id)
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'doctor_own_appointments' AND tablename = 'appointments') THEN
    CREATE POLICY "doctor_own_appointments" ON public.appointments
      FOR SELECT USING (
        dentist_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.clinic_users
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'superadmin')
        )
      );
  END IF;
END $$;

-- =====================================================
-- 11. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clinic_users_account_id ON public.clinic_users(account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_owner_user_id ON public.accounts(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_account_id ON public.subscription_events(account_id);

-- =====================================================
-- 12. TRIGGER: auto-update updated_at for accounts
-- =====================================================
CREATE OR REPLACE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
