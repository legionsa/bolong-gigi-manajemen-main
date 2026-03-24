-- F1 + F2: Patient Portal and Communications Tables
-- This migration adds tables for automated reminders, NPS, recall campaigns, and digital consent

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

-- Communication templates for automated messages
CREATE TABLE IF NOT EXISTS communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('reminder', 'followup', 'recall', 'nps', 'confirmation', 'care_instructions')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Log of all sent communications
CREATE TABLE IF NOT EXISTS communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email')),
  template_id UUID REFERENCES communication_templates(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opt_out', 'clicked')),
  external_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PATIENT PORTAL TABLES
-- =====================================================

-- Patient portal tokens (OTP, magic links, password resets)
CREATE TABLE IF NOT EXISTS patient_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  token_hash TEXT NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('otp', 'reset_password', 'magic_link', 'email_verification')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Online appointment bookings (public booking form)
CREATE TABLE IF NOT EXISTS online_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_date DATE NOT NULL,
  requested_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
  notes TEXT,
  otp_code TEXT,
  otp_expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- NPS SURVEY
-- =====================================================

-- NPS (Net Promoter Score) responses
CREATE TABLE IF NOT EXISTS nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  follow_up_requested BOOLEAN DEFAULT false,
  submitted_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- CONSENT FORMS
-- =====================================================

-- Digital consent form signatures
CREATE TABLE IF NOT EXISTS consent_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('initial', 'treatment', 'telehealth', 'data_consent', 'privacy', 'terms')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- COLUMN ADDITIONS TO EXISTING TABLES
-- =====================================================

-- Patients table additions
ALTER TABLE patients ADD COLUMN IF NOT EXISTS portal_password_hash TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'sms', 'email'));
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_visit_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS recall_status TEXT DEFAULT 'active' CHECK (recall_status IN ('active', 'overdue_6m', 'overdue_12m', 'dormant', 'contacted', 'converted'));
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_portal_active BOOLEAN DEFAULT false;

-- Appointments table additions
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_status TEXT DEFAULT 'pending' CHECK (reminder_status IN ('pending', 'scheduled', 'sent_48h', 'sent_24h', 'sent_2h', 'confirmed', 'no_show', 'cancelled'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sms_reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS email_reminder_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS online_booking_id UUID REFERENCES online_bookings(id) ON DELETE SET NULL;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS nps_sent BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS nps_responded BOOLEAN DEFAULT false;

-- Services table additions
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_preparation BOOLEAN DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS preparation_instructions TEXT;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS communication_log_patient_id_idx ON communication_log(patient_id);
CREATE INDEX IF NOT EXISTS communication_log_appointment_id_idx ON communication_log(appointment_id);
CREATE INDEX IF NOT EXISTS communication_log_status_idx ON communication_log(status);
CREATE INDEX IF NOT EXISTS communication_log_created_at_idx ON communication_log(created_at);
CREATE INDEX IF NOT EXISTS patient_portal_tokens_patient_id_idx ON patient_portal_tokens(patient_id);
CREATE INDEX IF NOT EXISTS patient_portal_tokens_expires_at_idx ON patient_portal_tokens(expires_at);
CREATE INDEX IF NOT EXISTS online_bookings_patient_id_idx ON online_bookings(patient_id);
CREATE INDEX IF NOT EXISTS online_bookings_status_idx ON online_bookings(status);
CREATE INDEX IF NOT EXISTS online_bookings_requested_date_idx ON online_bookings(requested_date);
CREATE INDEX IF NOT EXISTS nps_responses_patient_id_idx ON nps_responses(patient_id);
CREATE INDEX IF NOT EXISTS nps_responses_appointment_id_idx ON nps_responses(appointment_id);
CREATE INDEX IF NOT EXISTS consent_forms_patient_id_idx ON consent_forms(patient_id);
CREATE INDEX IF NOT EXISTS patients_recall_status_idx ON patients(recall_status);
CREATE INDEX IF NOT EXISTS patients_last_visit_date_idx ON patients(last_visit_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;

-- Communication templates: admin can manage, staff can read
CREATE POLICY "Admin can manage communication templates"
  ON communication_templates FOR ALL
  USING (auth.jwt() -> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM users WHERE users.user_auth_id = auth.uid() AND users.role_name IN ('Super Admin', 'Admin', 'Staff')
  ));

CREATE POLICY "Authenticated users can read active communication templates"
  ON communication_templates FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

-- Communication log: admin and staff can manage, patients can read own
CREATE POLICY "Admin and staff can manage communication log"
  ON communication_log FOR ALL
  USING (auth.jwt() -> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM users WHERE users.user_auth_id = auth.uid() AND users.role_name IN ('Super Admin', 'Admin', 'Staff')
  ));

CREATE POLICY "Patients can read own communication log"
  ON communication_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = communication_log.patient_id AND patients.user_auth_id = auth.uid()
  ));

-- Patient portal tokens: patients can manage own tokens
CREATE POLICY "Patients can insert own portal tokens"
  ON patient_portal_tokens FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_portal_tokens.patient_id
  ));

CREATE POLICY "Patients can read own portal tokens"
  ON patient_portal_tokens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_portal_tokens.patient_id AND patients.user_auth_id = auth.uid()
  ));

CREATE POLICY "Patients can update own portal tokens"
  ON patient_portal_tokens FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = patient_portal_tokens.patient_id AND patients.user_auth_id = auth.uid()
  ));

-- Online bookings: anyone can create, admin/staff can manage, patients can read own
CREATE POLICY "Anyone can create online bookings"
  ON online_bookings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin and staff can manage online bookings"
  ON online_bookings FOR ALL
  USING (auth.jwt() -> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM users WHERE users.user_auth_id = auth.uid() AND users.role_name IN ('Super Admin', 'Admin', 'Staff')
  ));

CREATE POLICY "Patients can read own online bookings"
  ON online_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = online_bookings.patient_id AND patients.user_auth_id = auth.uid()
  ));

-- NPS responses: staff can manage, patients can read/write own
CREATE POLICY "Admin and staff can manage NPS responses"
  ON nps_responses FOR ALL
  USING (auth.jwt() -> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM users WHERE users.user_auth_id = auth.uid() AND users.role_name IN ('Super Admin', 'Admin', 'Staff')
  ));

CREATE POLICY "Patients can insert own NPS responses"
  ON nps_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = nps_responses.patient_id AND patients.user_auth_id = auth.uid()
  ));

CREATE POLICY "Patients can read own NPS responses"
  ON nps_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = nps_responses.patient_id AND patients.user_auth_id = auth.uid()
  ));

-- Consent forms: staff can manage, patients can read/write own
CREATE POLICY "Admin and staff can manage consent forms"
  ON consent_forms FOR ALL
  USING (auth.jwt() -> 'role' = 'authenticated' AND EXISTS (
    SELECT 1 FROM users WHERE users.user_auth_id = auth.uid() AND users.role_name IN ('Super Admin', 'Admin', 'Staff')
  ));

CREATE POLICY "Patients can insert own consent forms"
  ON consent_forms FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = consent_forms.patient_id AND patients.user_auth_id = auth.uid()
  ));

CREATE POLICY "Patients can read own consent forms"
  ON consent_forms FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patients WHERE patients.id = consent_forms.patient_id AND patients.user_auth_id = auth.uid()
  ));

-- =====================================================
-- DEFAULT DATA: Communication Templates
-- =====================================================

INSERT INTO communication_templates (type, channel, subject, body, variables, is_active) VALUES
-- Appointment Reminders (WhatsApp)
('reminder', 'whatsapp', NULL,
'🏥 *Pengingat Jadwal Klinik Gigi*

Halo {{patient_name}}!

Ini adalah pengingat bahwa Anda memiliki jadwal perawatan gigi:

📅 *Tanggal:* {{appointment_date}}
🕐 *Waktu:* {{appointment_time}} WIB
👨‍⚕️ *Dokter:* {{doctor_name}}
📍 *Layanan:* {{service_name}}

Balas *OK* untuk konfirmasi atau *UJUKAN* untuk menjadwalkan ulang.

Jika ada pertanyaan, silakan hubungi kami.',
ARRAY['patient_name', 'appointment_date', 'appointment_time', 'doctor_name', 'service_name'], true),

-- Appointment Reminder (Email)
('reminder', 'email', 'Pengingat Jadwal Klinik Gigi - {{appointment_date}}',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
<h2>Pengingat Jadwal Klinik Gigi</h2>
<p>Halo <strong>{{patient_name}}</strong>,</p>
<p>Ini adalah pengingat bahwa Anda memiliki jadwal perawatan gigi:</p>
<ul>
<li><strong>Tanggal:</strong> {{appointment_date}}</li>
<li><strong>Waktu:</strong> {{appointment_time}} WIB</li>
<li><strong>Dokter:</strong> {{doctor_name}}</li>
<li><strong>Layanan:</strong> {{service_name}}</li>
</ul>
<p>Harap hadir 15 menit sebelum jadwal untuk registrasi.</p>
<p>Jika perlu menjadwalkan ulang, silakan hubungi kami.</p>
<p>Hormat kami,<br>Klinik Gigi</p>
</body>
</html>',
ARRAY['patient_name', 'appointment_date', 'appointment_time', 'doctor_name', 'service_name'], true),

-- NPS Survey (WhatsApp)
('nps', 'whatsapp', NULL,
'🏥 *Bagaimana Pengalaman Anda?*

Terima kasih telah kunjungan di Klinik Gigi!

Mohon luangkan waktu sejenak untuk memberikan penilaian:

Silakan balas dengan angka 0-10:
- *0-6:* Tidak puas
- *7-8:* Puas
- *9-10:* Sangat puas

Apakah Anda puas dengan layanan kami hari ini?',
ARRAY['patient_name', 'appointment_date', 'doctor_name'], true),

-- NPS Survey (Email)
('nps', 'email', 'Bagaimana Pengalaman Anda di Klinik Gigi?',
'<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
<h2>Survei Kepuasan Pasien</h2>
<p>Halo <strong>{{patient_name}}</strong>,</p>
<p>Terima kasih telah berkunjung ke Klinik Gigi pada {{appointment_date}}.</p>
<p>Kami ingin mengetahui pengalaman Anda. Silakan berikan penilaian Anda:</p>
<ul>
<li><strong>0-6:</strong> Tidak puas</li>
<li><strong>7-8:</strong> Puas</li>
<li><strong>9-10:</strong> Sangat puas</li>
</ul>
<p>Balas email ini dengan skor Anda (0-10) dan komentar jika ada.</p>
<p>Masukan Anda sangat berarti untuk meningkatkan layanan kami.</p>
<p>Hormat kami,<br>Klinik Gigi</p>
</body>
</html>',
ARRAY['patient_name', 'appointment_date'], true),

-- Care Instructions (WhatsApp)
('care_instructions', 'whatsapp', NULL,
'🏥 *Petunjuk Perawatan Pasca-Perawatan*

Halo {{patient_name}},

Terima kasih telah menjalani perawatan di Klinik Gigi.

{{care_instructions}}

Jika Anda mengalami masalah atau pertanyaan, jangan ragu untuk menghubungi kami.

Tim Klinik Gigi',
ARRAY['patient_name', 'care_instructions'], true),

-- Recall Message (WhatsApp)
('recall', 'whatsapp', NULL,
'🏥 *Eits, Sudah Lama Tidak Kunjungan!*

Halo {{patient_name}}!

Sudah beberapa waktu sejak kunjungan terakhir Anda di Klinik Gigi.

Tahukah Anda bahwa pemeriksaan rutin gigi sangat penting untuk menjaga kesehatan mulut?

Kami sangat misses Anda! Yuk, jadwalkan kunjungan baru Anda.

Klik link berikut untuk booking: {{booking_link}}

Sampai jumpa di Klinik Gigi! 😊',
ARRAY['patient_name', 'booking_link'], true);

-- =====================================================
-- FUNCTION: Trigger to update last_visit_date
-- =====================================================

CREATE OR REPLACE FUNCTION update_last_visit_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Selesai' AND OLD.status != 'Selesai' THEN
    UPDATE patients SET last_visit_date = CURRENT_DATE WHERE id = NEW.patient_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_last_visit ON appointments;
CREATE TRIGGER trigger_update_last_visit
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_last_visit_date();

-- =====================================================
-- FUNCTION: Update recall status for patients
-- =====================================================

CREATE OR REPLACE FUNCTION update_recall_status()
RETURNS void AS $$
BEGIN
  -- Mark patients overdue for 6 months
  UPDATE patients
  SET recall_status = 'overdue_6m'
  WHERE last_visit_date < CURRENT_DATE - INTERVAL '6 months'
    AND recall_status = 'active';

  -- Mark patients overdue for 12 months
  UPDATE patients
  SET recall_status = 'overdue_12m'
  WHERE last_visit_date < CURRENT_DATE - INTERVAL '12 months'
    AND recall_status IN ('active', 'overdue_6m');

  -- Mark patients dormant for 18+ months
  UPDATE patients
  SET recall_status = 'dormant'
  WHERE last_visit_date < CURRENT_DATE - INTERVAL '18 months'
    AND recall_status IN ('active', 'overdue_6m', 'overdue_12m');
END;
$$ LANGUAGE plpgsql;