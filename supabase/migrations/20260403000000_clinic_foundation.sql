-- =====================================================
-- PUBLIC CLINIC TENANT TABLES
-- Foundation for onboarding + multi-branch
-- =====================================================

-- User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       TEXT NOT NULL DEFAULT '',
  phone           TEXT,
  whatsapp        TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Clinics table (one per clinic tenant)
CREATE TABLE IF NOT EXISTS public.clinics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL DEFAULT 'Klinik Baru',
  type                TEXT DEFAULT 'general_dental'
                        CHECK (type IN ('general_dental','specialist_dental','polyclinic','dental_hospital')),
  logo_url            TEXT,

  -- Location
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  province            TEXT,
  city                TEXT,
  district            TEXT,
  sub_district        TEXT,
  full_address        TEXT,
  postal_code         CHAR(5),
  google_maps_url     TEXT,

  -- Head of clinic
  head_title          TEXT,
  head_name           TEXT,
  str_number          TEXT,
  str_expiry_date     DATE,
  sip_number          TEXT,
  sip_expiry_date     DATE,

  -- Contact
  email               TEXT,
  phone               TEXT,
  whatsapp            TEXT,
  website             TEXT,
  instagram_handle    TEXT,

  -- Status
  status              TEXT NOT NULL DEFAULT 'onboarding'
                        CHECK (status IN ('onboarding','active','suspended','churned')),
  onboarded_at        TIMESTAMPTZ,
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Clinic users junction (user ↔ clinic ↔ role)
CREATE TABLE IF NOT EXISTS public.clinic_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL DEFAULT 'clinic_admin'
                        CHECK (role IN (
                          'clinic_admin',
                          'receptionist',
                          'dentist',
                          'specialist_dentist',
                          'nurse',
                          'assistant',
                          'pharmacist',
                          'admin'
                        )),
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','active','inactive')),
  invited_by          UUID REFERENCES auth.users(id),
  date_started        DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)
);

-- Operating hours per clinic per day
CREATE TABLE IF NOT EXISTS public.clinic_operating_hours (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week         SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open             BOOLEAN NOT NULL DEFAULT TRUE,
  open_time           TIME,
  close_time          TIME,
  break_start         TIME,
  break_end           TIME,
  slot_duration_mins  SMALLINT DEFAULT 30,
  accept_walk_in      BOOLEAN DEFAULT FALSE,
  UNIQUE (clinic_id, day_of_week)
);

-- Employee permissions overrides
CREATE TABLE IF NOT EXISTS public.employee_permissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_user_id      UUID NOT NULL REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  permission_key      TEXT NOT NULL,
  is_granted          BOOLEAN NOT NULL DEFAULT TRUE,
  set_by              UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_user_id, permission_key)
);

-- Onboarding progress tracker
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID UNIQUE NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  current_step        SMALLINT NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
  step_data           JSONB NOT NULL DEFAULT '{}',
  completed_steps     SMALLINT[] DEFAULT '{}',
  last_saved_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_clinic_users_user_id ON public.clinic_users(user_id);
CREATE INDEX IF NOT EXISTS idx_clinic_users_clinic_id ON public.clinic_users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_status ON public.clinics(status);
CREATE INDEX IF NOT EXISTS idx_operating_hours_clinic ON public.clinic_operating_hours(clinic_id, day_of_week);

-- =====================================================
-- TRIGGER: auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER clinics_updated_at
  BEFORE UPDATE ON public.clinics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER clinic_users_updated_at
  BEFORE UPDATE ON public.clinic_users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "users_insert_own_profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Clinic users can read their clinic data
CREATE POLICY "clinic_users_read_own_clinic" ON public.clinics
  FOR SELECT USING (
    id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status IN ('active', 'pending')
    )
  );

-- Clinic users can read their own clinic_users records
CREATE POLICY "clinic_users_read_own" ON public.clinic_users
  FOR SELECT USING (user_id = auth.uid());

-- Admin can manage clinic_users for their clinic
CREATE POLICY "admin_manage_clinic_users" ON public.clinic_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.clinic_id = clinic_users.clinic_id
        AND cu.role = 'clinic_admin'
        AND cu.status = 'active'
    )
  );

-- Clinic users can read operating hours for their clinic
CREATE POLICY "clinic_read_operating_hours" ON public.clinic_operating_hours
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status IN ('active', 'pending')
    )
  );

-- Admin can manage operating hours
CREATE POLICY "admin_manage_operating_hours" ON public.clinic_operating_hours
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.clinic_id = clinic_operating_hours.clinic_id
        AND cu.role = 'clinic_admin'
        AND cu.status = 'active'
    )
  );

-- Admin can manage onboarding progress
CREATE POLICY "admin_manage_onboarding" ON public.onboarding_progress
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND role = 'clinic_admin'
        AND status IN ('active', 'pending')
    )
  );

-- =====================================================
-- AUTO-CREATE user_profile ON auth.user creation
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
