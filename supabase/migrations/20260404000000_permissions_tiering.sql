-- =====================================================
-- PERMISSIONS, ROLES, TIERS & PAYWALL
-- Phase 1: Database Foundation
-- =====================================================
-- This migration is idempotent and adds:
-- - New enums: user_role, service_tier
-- - accounts table (one per registered user — owns subscription)
-- - tier_limits config table
-- - subscription_events table
-- - account_id column on clinic_users with updated role/status constraints
-- - account_active_tier view
-- - check_tier_limit() function
-- - check_clinic_limit() function
-- - Updated RLS policies
-- =====================================================

-- 1. Create enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('superadmin', 'admin', 'doctor', 'finance', 'front_desk');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE service_tier AS ENUM ('free', 'pro_trial', 'pro', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create accounts table (one per registered user — owns subscription)
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
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create tier_limits config table
CREATE TABLE IF NOT EXISTS public.tier_limits (
  tier                          service_tier PRIMARY KEY,
  max_clinics                  SMALLINT NOT NULL DEFAULT 1,
  max_doctors_per_clinic       SMALLINT NOT NULL DEFAULT 2,
  max_front_desk_per_clinic    SMALLINT NOT NULL DEFAULT 1,
  max_finance_per_clinic       SMALLINT NOT NULL DEFAULT 0,
  max_admins_per_clinic        SMALLINT NOT NULL DEFAULT 1,
  max_storage_gb               SMALLINT NOT NULL DEFAULT 1,
  analytics_days                SMALLINT NOT NULL DEFAULT 7,
  can_export                   BOOLEAN NOT NULL DEFAULT FALSE,
  can_whatsapp                 BOOLEAN NOT NULL DEFAULT FALSE,
  can_bpjs                     BOOLEAN NOT NULL DEFAULT FALSE,
  can_ai_notes                 BOOLEAN NOT NULL DEFAULT FALSE,
  can_patient_portal           BOOLEAN NOT NULL DEFAULT FALSE,
  max_surat_izin_templates     SMALLINT NOT NULL DEFAULT 1,
  can_custom_subdomain         BOOLEAN NOT NULL DEFAULT FALSE
);

-- Insert tier limits (idempotent via ON CONFLICT)
INSERT INTO public.tier_limits (tier, max_clinics, max_doctors_per_clinic, max_front_desk_per_clinic, max_finance_per_clinic, max_admins_per_clinic, max_storage_gb, analytics_days, can_export, can_whatsapp, can_bpjs, can_ai_notes, can_patient_portal, max_surat_izin_templates, can_custom_subdomain) VALUES
  ('free',       1,  2, 1, 0, 1,  1,  7,  false, false, false, false, false, 1,  false),
  ('pro_trial', -1, -1,-1,-1,-1, 25, -1,  true,  true,  true,  true,  true, -1, false),
  ('pro',       -1, -1,-1,-1,-1, 25, -1,  true,  true,  true,  true,  true, -1, true),
  ('enterprise',-1, -1,-1,-1,-1, -1, -1,  true,  true,  true,  true,  true, -1, true)
ON CONFLICT (tier) DO UPDATE SET
  max_clinics = EXCLUDED.max_clinics,
  max_doctors_per_clinic = EXCLUDED.max_doctors_per_clinic,
  max_front_desk_per_clinic = EXCLUDED.max_front_desk_per_clinic,
  max_finance_per_clinic = EXCLUDED.max_finance_per_clinic,
  max_admins_per_clinic = EXCLUDED.max_admins_per_clinic,
  max_storage_gb = EXCLUDED.max_storage_gb,
  analytics_days = EXCLUDED.analytics_days,
  can_export = EXCLUDED.can_export,
  can_whatsapp = EXCLUDED.can_whatsapp,
  can_bpjs = EXCLUDED.can_bpjs,
  can_ai_notes = EXCLUDED.can_ai_notes,
  can_patient_portal = EXCLUDED.can_patient_portal,
  max_surat_izin_templates = EXCLUDED.max_surat_izin_templates,
  can_custom_subdomain = EXCLUDED.can_custom_subdomain;

-- 4. Create subscription_events table
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id),
  event_type      TEXT NOT NULL,
  from_tier       service_tier,
  to_tier         service_tier,
  amount_idr      INTEGER,
  payment_method  TEXT,
  reference_id    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Add account_id to clinic_users and update role constraint
ALTER TABLE public.clinic_users ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
ALTER TABLE public.clinic_users DROP CONSTRAINT IF EXISTS clinic_users_role_check;
ALTER TABLE public.clinic_users ADD CONSTRAINT clinic_users_role_check
  CHECK (role IN ('superadmin','admin','doctor','finance','front_desk'));
ALTER TABLE public.clinic_users ALTER COLUMN status TYPE TEXT;
ALTER TABLE public.clinic_users DROP CONSTRAINT IF EXISTS clinic_users_status_check;
ALTER TABLE public.clinic_users ADD CONSTRAINT clinic_users_status_check
  CHECK (status IN ('pending','active','inactive','over_limit'));

-- 6. Create account_active_tier view
CREATE OR REPLACE VIEW public.account_active_tier AS
SELECT a.id AS account_id, a.owner_user_id,
  CASE WHEN a.tier = 'pro_trial' AND a.trial_ends_at < NOW() THEN 'free'::service_tier ELSE a.tier END AS effective_tier,
  a.trial_ends_at, a.tier_expires_at, tl.*
FROM public.accounts a
JOIN public.tier_limits tl ON tl.tier = (
  CASE WHEN a.tier = 'pro_trial' AND a.trial_ends_at < NOW() THEN 'free' ELSE a.tier END
);

-- 7. Create check_tier_limit() function
CREATE OR REPLACE FUNCTION public.check_tier_limit(
  p_account_id UUID, p_clinic_id UUID, p_role user_role
) RETURNS TEXT AS $$
DECLARE v_tier RECORD; v_count INTEGER;
BEGIN
  SELECT * INTO v_tier FROM public.account_active_tier WHERE account_id = p_account_id;
  IF p_role = 'doctor' THEN
    SELECT COUNT(*) INTO v_count FROM public.clinic_users WHERE clinic_id = p_clinic_id AND role = 'doctor' AND status = 'active';
    IF v_tier.max_doctors_per_clinic != -1 AND v_count >= v_tier.max_doctors_per_clinic THEN RETURN 'limit.doctors'; END IF;
  ELSIF p_role = 'front_desk' THEN
    SELECT COUNT(*) INTO v_count FROM public.clinic_users WHERE clinic_id = p_clinic_id AND role = 'front_desk' AND status = 'active';
    IF v_tier.max_front_desk_per_clinic != -1 AND v_count >= v_tier.max_front_desk_per_clinic THEN RETURN 'limit.front_desk'; END IF;
  ELSIF p_role = 'finance' THEN
    IF v_tier.max_finance_per_clinic = 0 THEN RETURN 'limit.finance_free'; END IF;
  ELSIF p_role = 'admin' THEN
    SELECT COUNT(*) INTO v_count FROM public.clinic_users WHERE clinic_id = p_clinic_id AND role = 'admin' AND status = 'active';
    IF v_tier.max_admins_per_clinic != -1 AND v_count >= v_tier.max_admins_per_clinic THEN RETURN 'limit.admins'; END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create check_clinic_limit() function (for creating second clinic on Free)
CREATE OR REPLACE FUNCTION public.check_clinic_limit(
  p_account_id UUID
) RETURNS TEXT AS $$
DECLARE v_tier RECORD;
BEGIN
  SELECT * INTO v_tier FROM public.account_active_tier WHERE account_id = p_account_id;
  IF v_tier.max_clinics != -1 AND v_tier.clinics_used >= v_tier.max_clinics THEN
    RETURN 'limit.clinics';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Update RLS on clinic_users
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that will be replaced
DROP POLICY IF EXISTS users_in_own_clinic ON public.clinic_users;
DROP POLICY IF EXISTS admin_manage_clinic_users ON public.clinic_users;
DROP POLICY IF EXISTS clinic_users_read_own ON public.clinic_users;

-- Create new SELECT policy: users can read clinic_users in their clinic
CREATE POLICY "users_in_own_clinic" ON public.clinic_users
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status IN ('active', 'pending')
    )
  );

-- Create new INSERT policy: admin/superadmin can add users
CREATE POLICY "admin_can_manage_users" ON public.clinic_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = clinic_users.clinic_id
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
  );

-- Create new UPDATE policy: admin/superadmin can update users
CREATE POLICY "admin_can_update_users" ON public.clinic_users
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = clinic_users.clinic_id
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
  );

-- 10. Add RLS to accounts table
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_account" ON public.accounts;
CREATE POLICY "users_read_own_account" ON public.accounts
  FOR SELECT USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_own_account" ON public.accounts;
CREATE POLICY "users_update_own_account" ON public.accounts
  FOR UPDATE USING (owner_user_id = auth.uid());

-- Trigger for accounts updated_at
CREATE OR REPLACE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();