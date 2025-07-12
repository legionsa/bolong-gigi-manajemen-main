
-- Phase 1 (Corrected): Implement Baseline Row-Level Security (RLS)

-- Drop all policies that might have been created in the failed attempt or before
-- to ensure a clean slate.
DROP POLICY IF EXISTS "Allow individual read access" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users to read dentists" ON public.users;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Allow user to update their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow user to read own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated users full access to patients" ON public.patients;
DROP POLICY IF EXISTS "Allow authenticated users full access to appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow authenticated users full access to medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Allow authenticated users to view all schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow doctors to manage their own schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow doctors to insert their own schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow doctors to update their own schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow doctors to delete their own schedules" ON public.doctor_schedules;
DROP POLICY IF EXISTS "Allow authenticated users full access to billing_items" ON public.billing_items;
DROP POLICY IF EXISTS "Allow authenticated users full access to payments" ON public.payments;
DROP POLICY IF EXISTS "Allow authenticated users full access to prescriptions" ON public.prescriptions_enhanced;
DROP POLICY IF EXISTS "Allow authenticated users full access to prescription items" ON public.prescription_items_enhanced;
DROP POLICY IF EXISTS "Allow authenticated users full access to attachments" ON public.medical_record_attachments;

-- Helper Functions for RLS Policies
-- Using SECURITY DEFINER functions is a best practice to avoid recursive RLS checks.

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS TEXT AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  SELECT role_name INTO v_role_name
  FROM public.users
  WHERE user_auth_id = p_user_id;
  RETURN v_role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_profile_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS
$$
  SELECT id FROM public.users WHERE user_auth_id = auth.uid() LIMIT 1;
$$;


-- Enable RLS and define policies for each table

-- Table: users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read dentists" ON public.users
FOR SELECT USING (role_name = 'Dentist');

CREATE POLICY "Allow user to read own profile" ON public.users
FOR SELECT USING (auth.uid() = user_auth_id);

CREATE POLICY "Allow user to update their own profile" ON public.users
FOR UPDATE USING (auth.uid() = user_auth_id)
WITH CHECK (auth.uid() = user_auth_id);


-- Table: patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to patients" ON public.patients
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: appointments
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to appointments" ON public.appointments
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: medical_records
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to medical records" ON public.medical_records
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: doctor_schedules
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to view all schedules" ON public.doctor_schedules
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow doctors to insert their own schedules" ON public.doctor_schedules
FOR INSERT WITH CHECK (doctor_id = public.get_current_user_profile_id());

CREATE POLICY "Allow doctors to update their own schedules" ON public.doctor_schedules
FOR UPDATE USING (doctor_id = public.get_current_user_profile_id()) WITH CHECK (doctor_id = public.get_current_user_profile_id());

CREATE POLICY "Allow doctors to delete their own schedules" ON public.doctor_schedules
FOR DELETE USING (doctor_id = public.get_current_user_profile_id());

-- Table: billing_items
ALTER TABLE public.billing_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to billing_items" ON public.billing_items
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to payments" ON public.payments
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: prescriptions_enhanced
ALTER TABLE public.prescriptions_enhanced ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to prescriptions" ON public.prescriptions_enhanced
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: prescription_items_enhanced
ALTER TABLE public.prescription_items_enhanced ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to prescription items" ON public.prescription_items_enhanced
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Table: medical_record_attachments
ALTER TABLE public.medical_record_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users full access to attachments" ON public.medical_record_attachments
FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
