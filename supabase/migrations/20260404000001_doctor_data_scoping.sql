-- =====================================================
-- DOCTOR DATA SCOPING (RLS)
-- Phase 8: Doctor Data Scoping
-- =====================================================
-- Ensures doctors can only see their own patients and records
-- Admins/superadmins see everything
-- =====================================================
-- Note: appointments.dentist_id = users.id (not doctors.id)
--       medical_records.doctor_id = users.id
-- =====================================================

-- =====================================================
-- 1. MEDICAL_RECORDS - SELECT policy (doctor-scoped)
-- =====================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "doctor_own_medical_records" ON public.medical_records;

  CREATE POLICY "doctor_own_medical_records" ON public.medical_records
    FOR SELECT USING (
      -- Admins and superadmins see all
      EXISTS (
        SELECT 1 FROM public.clinic_users
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'superadmin')
          AND status = 'active'
      )
      OR
      -- Doctors see records for their own patients (via dentist_id in appointments)
      (
        EXISTS (
          SELECT 1 FROM public.clinic_users
          WHERE user_id = auth.uid()
            AND role = 'doctor'
            AND status = 'active'
        )
        AND
        patient_id IN (
          SELECT DISTINCT a.patient_id
          FROM public.appointments a
          WHERE a.dentist_id = auth.uid()
        )
      )
    );
END $$;

-- =====================================================
-- 2. MEDICAL_RECORDS - INSERT policy
-- =====================================================
DROP POLICY IF EXISTS "doctor_insert_medical_records" ON public.medical_records;
CREATE POLICY "doctor_insert_medical_records" ON public.medical_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin', 'doctor')
        AND status = 'active'
    )
  );

-- =====================================================
-- 3. MEDICAL_RECORDS - UPDATE policy
-- =====================================================
DROP POLICY IF EXISTS "doctor_update_medical_records" ON public.medical_records;
CREATE POLICY "doctor_update_medical_records" ON public.medical_records
  FOR UPDATE USING (
    -- Can update if:
    -- 1. Admin/superadmin
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
    OR
    -- 2. The doctor who created the record (doctor_id = users.id)
    (
      doctor_id = auth.uid()
      AND
      EXISTS (
        SELECT 1 FROM public.clinic_users
        WHERE user_id = auth.uid()
          AND role = 'doctor'
          AND status = 'active'
      )
    )
  );

-- =====================================================
-- 4. MEDICAL_RECORDS - DELETE policy
-- =====================================================
DROP POLICY IF EXISTS "doctor_delete_medical_records" ON public.medical_records;
CREATE POLICY "doctor_delete_medical_records" ON public.medical_records
  FOR DELETE USING (
    -- Only admins and superadmins can delete
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
  );

-- =====================================================
-- 5. PATIENTS - SELECT policy (doctor-scoped view only)
-- =====================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "doctor_view_patients" ON public.patients;

  CREATE POLICY "doctor_view_patients" ON public.patients
    FOR SELECT USING (
      -- Admins and superadmins see all
      EXISTS (
        SELECT 1 FROM public.clinic_users
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'superadmin')
          AND status = 'active'
      )
      OR
      -- Doctors see patients they've treated (via dentist_id in appointments)
      (
        EXISTS (
          SELECT 1 FROM public.clinic_users
          WHERE user_id = auth.uid()
            AND role = 'doctor'
            AND status = 'active'
        )
        AND
        id IN (
          SELECT DISTINCT a.patient_id
          FROM public.appointments a
          WHERE a.dentist_id = auth.uid()
        )
      )
    );
END $$;

-- =====================================================
-- 6. Ensure RLS is enabled on all affected tables
-- =====================================================
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
