-- =====================================================
-- MULTI-BRANCH SUPPORT
-- Adds organizational grouping and branch locations
-- =====================================================

-- Add org_id to clinics for grouping multiple clinics under one organization
ALTER TABLE public.clinics ADD COLUMN org_id UUID;

-- Create branches table (physical locations within a clinic)
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link doctors to branches (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.doctor_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (doctor_id, branch_id)
);

-- Per-branch service pricing
CREATE TABLE IF NOT EXISTS public.branch_service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price DECIMAL(12,2) NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, service_id, effective_from)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_branches_clinic_id ON public.branches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_branches_is_main ON public.branches(clinic_id, is_main) WHERE is_main = true;
CREATE INDEX IF NOT EXISTS idx_doctor_branches_doctor_id ON public.doctor_branches(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_branches_branch_id ON public.doctor_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_service_pricing_branch_id ON public.branch_service_pricing(branch_id);

-- =====================================================
-- TRIGGER: auto-update updated_at for branches
-- =====================================================
CREATE OR REPLACE TRIGGER branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_service_pricing ENABLE ROW LEVEL SECURITY;

-- Branches: users can read branches for their clinic
CREATE POLICY "clinic_users_read_branches" ON public.branches
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status IN ('active', 'pending')
    )
  );

-- Branches: admins can manage branches for their clinic
CREATE POLICY "clinic_admin_manage_branches" ON public.branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.clinic_id = branches.clinic_id
        AND cu.role = 'clinic_admin'
        AND cu.status = 'active'
    )
  );

-- Doctor branches: users can read their own doctor_branch associations
CREATE POLICY "doctors_read_own_branches" ON public.doctor_branches
  FOR SELECT USING (
    doctor_id IN (
      SELECT id FROM public.users WHERE user_auth_id = auth.uid()
    )
  );

-- Doctor branches: admins can manage doctor_branch associations for their clinic
CREATE POLICY "clinic_admin_manage_doctor_branches" ON public.doctor_branches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users cu
      JOIN public.branches b ON b.clinic_id = cu.clinic_id
      WHERE cu.user_id = auth.uid()
        AND cu.role = 'clinic_admin'
        AND cu.status = 'active'
        AND doctor_branches.branch_id = b.id
    )
  );

-- Branch service pricing: users can read pricing for their clinic branches
CREATE POLICY "clinic_users_read_branch_pricing" ON public.branch_service_pricing
  FOR SELECT USING (
    branch_id IN (
      SELECT b.id FROM public.branches b
      JOIN public.clinic_users cu ON cu.clinic_id = b.clinic_id
      WHERE cu.user_id = auth.uid() AND cu.status IN ('active', 'pending')
    )
  );

-- Branch service pricing: admins can manage pricing for their clinic branches
CREATE POLICY "clinic_admin_manage_branch_pricing" ON public.branch_service_pricing
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users cu
      JOIN public.branches b ON b.clinic_id = cu.clinic_id
      WHERE cu.user_id = auth.uid()
        AND cu.role = 'clinic_admin'
        AND cu.status = 'active'
        AND branch_service_pricing.branch_id = b.id
    )
  );

-- =====================================================
-- FUNCTION: ensure user has access to a specific branch
-- =====================================================
CREATE OR REPLACE FUNCTION public.user_has_branch_access(p_branch_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.clinic_users cu
    JOIN public.branches b ON b.clinic_id = cu.clinic_id
    WHERE cu.user_id = auth.uid()
      AND cu.status IN ('active', 'pending')
      AND b.id = p_branch_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Add branch_id to appointments table
-- =====================================================
ALTER TABLE public.appointments ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- Create index for faster branch-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON public.appointments(branch_id);

-- RLS for appointments branch_id
-- The existing policy already grants full access to authenticated users
-- We just need to ensure branch_id can be read/updated
DROP POLICY IF EXISTS "Allow authenticated users full access to appointments" ON public.appointments;
CREATE POLICY "Allow authenticated users full access to appointments" ON public.appointments
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
