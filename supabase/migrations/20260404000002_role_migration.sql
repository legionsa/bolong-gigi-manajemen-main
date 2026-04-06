-- Phase 9: Role Migration — map old roles to new 5-role system
-- This migration MUST run after the permissions_tiering_paywall migration
-- which sets the new CHECK constraint

-- Step 1: Update all old roles to new roles
UPDATE public.clinic_users
SET
  role = CASE
    WHEN role IN ('clinic_admin', 'admin') THEN 'admin'
    WHEN role IN ('dentist', 'specialist_dentist') THEN 'doctor'
    WHEN role IN ('receptionist', 'nurse', 'assistant', 'pharmacist') THEN 'front_desk'
    ELSE role  -- keep as-is for superadmin or already-correct roles
  END,
  updated_at = NOW()
WHERE role IN (
  'clinic_admin', 'admin', 'receptionist', 'dentist',
  'specialist_dentist', 'nurse', 'assistant', 'pharmacist'
);

-- Step 2: Add account_id to clinic_users if not already present
-- (Phase 1 migration should have done this, but ensure it's here as backup)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'clinic_users' AND column_name = 'account_id') THEN
    ALTER TABLE public.clinic_users ADD COLUMN account_id UUID REFERENCES public.accounts(id);
  END IF;
END $$;

-- Step 3: Backfill account_id for existing clinic_users that don't have it
-- Find the owner_user_id from auth.users and match to accounts
UPDATE public.clinic_users cu
SET account_id = a.id
FROM public.accounts a
WHERE a.owner_user_id = (
  SELECT user_id FROM auth.users WHERE id = cu.user_id
)
AND cu.account_id IS NULL;

-- Step 4: Ensure all admins have at least 1 admin in each clinic
-- (if no admin exists for a clinic, upgrade the first staff member)
DO $$
DECLARE
  v_clinic RECORD;
BEGIN
  FOR v_clinic IN
    SELECT DISTINCT cu.clinic_id, cu.account_id
    FROM public.clinic_users cu
    WHERE cu.status IN ('active', 'pending')
    AND NOT EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE clinic_id = cu.clinic_id AND role = 'admin' AND status = 'active'
    )
  LOOP
    -- Upgrade the first staff member to admin
    UPDATE public.clinic_users
    SET role = 'admin', updated_at = NOW()
    WHERE id = (
      SELECT id FROM public.clinic_users
      WHERE clinic_id = v_clinic.clinic_id AND status IN ('active', 'pending')
      ORDER BY created_at ASC
      LIMIT 1
    );
  END LOOP;
END $$;

-- Step 5: Set over_limit status for excess staff on Free-tier accounts
-- For each Free account, mark excess users as over_limit
DO $$
DECLARE
  v_account RECORD;
BEGIN
  -- Get all free accounts via the account_active_tier view
  FOR v_account IN
    SELECT aat.account_id, aat.effective_tier,
           (SELECT COUNT(*) FROM public.clinic_users WHERE account_id = aat.account_id AND role = 'doctor' AND status = 'active') AS doctor_count,
           (SELECT COUNT(*) FROM public.clinic_users WHERE account_id = aat.account_id AND role = 'front_desk' AND status = 'active') AS fd_count,
           (SELECT COUNT(*) FROM public.clinic_users WHERE account_id = aat.account_id AND role = 'admin' AND status = 'active') AS admin_count
    FROM public.account_active_tier aat
    WHERE aat.effective_tier = 'free'
  LOOP
    -- Mark excess doctors (keep max 2)
    UPDATE public.clinic_users
    SET status = 'over_limit', updated_at = NOW()
    WHERE account_id = v_account.account_id
      AND role = 'doctor'
      AND status = 'active'
      AND id NOT IN (
        SELECT id FROM public.clinic_users
        WHERE account_id = v_account.account_id AND role = 'doctor' AND status = 'active'
        LIMIT 2
      );

    -- Mark excess front_desk (keep max 1)
    UPDATE public.clinic_users
    SET status = 'over_limit', updated_at = NOW()
    WHERE account_id = v_account.account_id
      AND role = 'front_desk'
      AND status = 'active'
      AND id NOT IN (
        SELECT id FROM public.clinic_users
        WHERE account_id = v_account.account_id AND role = 'front_desk' AND status = 'active'
        LIMIT 1
      );

    -- Mark excess admins (keep max 1)
    UPDATE public.clinic_users
    SET status = 'over_limit', updated_at = NOW()
    WHERE account_id = v_account.account_id
      AND role = 'admin'
      AND status = 'active'
      AND id NOT IN (
        SELECT id FROM public.clinic_users
        WHERE account_id = v_account.account_id AND role = 'admin' AND status = 'active'
        LIMIT 1
      );
  END LOOP;
END $$;

-- Step 6: Create accounts for existing users who don't have one
-- (Users who registered before the accounts table existed)
INSERT INTO public.accounts (owner_user_id, tier, trial_ends_at, clinics_used)
SELECT
  au.id,
  'pro_trial',
  NOW() + INTERVAL '14 days',
  (SELECT COUNT(*) FROM public.clinic_users WHERE user_id = au.id AND status IN ('active', 'pending'))
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.accounts WHERE owner_user_id = au.id)
AND EXISTS (SELECT 1 FROM public.clinic_users WHERE user_id = au.id);

-- Step 7: Backfill account_id using the newly created accounts
UPDATE public.clinic_users cu
SET account_id = a.id
FROM public.accounts a
WHERE a.owner_user_id = cu.user_id
AND cu.account_id IS NULL;

-- Step 8: Set clinics_used on all accounts
UPDATE public.accounts a
SET clinics_used = (
  SELECT COUNT(DISTINCT clinic_id)
  FROM public.clinic_users
  WHERE account_id = a.id AND status IN ('active', 'pending')
);

-- Step 9: Update auth.users metadata to set role_name to new role for display purposes
-- This ensures the UI still shows a human-readable role
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN
    SELECT cu.user_id, cu.role, au.email
    FROM public.clinic_users cu
    JOIN auth.users au ON au.id = cu.user_id
    WHERE cu.status IN ('active', 'pending')
  LOOP
    -- Note: Can't directly update auth.users metadata via service role easily
    -- This is informational — the app will use clinic_users.role for permissions
    -- and user_profiles.role_name for display
    NULL;
  END LOOP;
END $$;
