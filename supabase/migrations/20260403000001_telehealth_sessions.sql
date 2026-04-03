-- =====================================================
-- TELEHEALTH SESSIONS TABLE
-- Video consultation using Jitsi Meet embed
-- =====================================================

-- Create telehealth_sessions table
CREATE TABLE IF NOT EXISTS public.telehealth_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  room_name       TEXT NOT NULL,
  room_url        TEXT,
  host_name       TEXT,
  patient_name    TEXT,
  status          TEXT DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled', 'waiting', 'in_progress', 'completed', 'cancelled', 'no_show')),
  started_at      TIMESTAMPTZ,
  ended_at        TIMESTAMPTZ,
  duration_secs   INTEGER,
  notes           TEXT,
  recording_url    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add appointment_type to appointments table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'appointments' AND column_name = 'appointment_type'
  ) THEN
    ALTER TABLE public.appointments ADD COLUMN appointment_type TEXT DEFAULT 'in_clinic';
  END IF;
END $$;

-- Update existing telehealth appointments if appointment_type was added
UPDATE public.appointments
SET appointment_type = 'telehealth'
WHERE appointment_type IS NULL AND service_name ILIKE '%tele%';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_appointment_id ON public.telehealth_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_status ON public.telehealth_sessions(status);
CREATE INDEX IF NOT EXISTS idx_telehealth_sessions_room_name ON public.telehealth_sessions(room_name);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON public.appointments(appointment_type);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.telehealth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read telehealth sessions
CREATE POLICY "telehealth_sessions_read" ON public.telehealth_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to insert telehealth sessions
CREATE POLICY "telehealth_sessions_insert" ON public.telehealth_sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update telehealth sessions
CREATE POLICY "telehealth_sessions_update" ON public.telehealth_sessions
  FOR UPDATE USING (auth.role() = 'authenticated');

-- =====================================================
-- TRIGGER: auto-update ended_at when status changes to completed
-- =====================================================
CREATE OR REPLACE FUNCTION public.telehealth_session_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.ended_at = NOW();
    IF NEW.started_at IS NOT NULL THEN
      NEW.duration_secs = EXTRACT(EPOCH FROM (NOW() - NEW.started_at))::INTEGER;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER telehealth_session_completed_trigger
  BEFORE UPDATE ON public.telehealth_sessions
  FOR EACH ROW EXECUTE FUNCTION public.telehealth_session_completed();