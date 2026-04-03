-- AI Note Drafts Table for SOAP Note Generation
-- Stores AI-generated SOAP notes from voice transcription with ICD-10/ICD-9 code suggestions

CREATE TABLE IF NOT EXISTS ai_note_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id),
  raw_transcription TEXT,
  generated_note TEXT, -- SOAP formatted: Subjective, Objective, Assessment, Plan
  icd10_codes JSONB, -- [{code: "K02.1", label: "Dental Caries", confidence: 0.95}]
  icd9_codes JSONB, -- [{code: "201.1", label: "Filling", confidence: 0.88}]
  confidence_score DECIMAL(3,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected', 'needs_revision')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_note_drafts_patient_id ON ai_note_drafts(patient_id);
CREATE INDEX IF NOT EXISTS idx_ai_note_drafts_appointment_id ON ai_note_drafts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_ai_note_drafts_status ON ai_note_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_note_drafts_created_at ON ai_note_drafts(created_at DESC);

-- RLS Policies
ALTER TABLE ai_note_drafts ENABLE ROW LEVEL SECURITY;

-- Dentists and admins can view all drafts
CREATE POLICY "View ai_note_drafts for authenticated users"
  ON ai_note_drafts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_name IN ('admin', 'dentist', 'doctor')
    )
  );

-- Only the AI system (service role) can insert drafts
CREATE POLICY "Insert ai_note_drafts for service role"
  ON ai_note_drafts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = ANY(
      SELECT id FROM users WHERE role_name = 'service_role' OR role_name = 'admin'
    )
  );

-- Only admins and dentists can update (approve/reject)
CREATE POLICY "Update ai_note_drafts for dentists"
  ON ai_note_drafts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role_name IN ('admin', 'dentist', 'doctor')
    )
  );

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_note_drafts_updated_at
  BEFORE UPDATE ON ai_note_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();