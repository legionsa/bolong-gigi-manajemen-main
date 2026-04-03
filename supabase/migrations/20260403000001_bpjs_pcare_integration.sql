-- =====================================================
-- BPJS P-Care Integration Tables
-- DentiCare Pro - Clinic Management System
-- =====================================================

-- =====================================================
-- ADD BPJS COLUMNS TO PATIENTS TABLE
-- =====================================================
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS bpjs_number TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS bpjs_active BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.patients.bpjs_number IS 'BPJS Kesehatan participant number (16 digits)';
COMMENT ON COLUMN public.patients.bpjs_active IS 'Whether the patient has active BPJS coverage';

-- =====================================================
-- BPJS CLAIMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bpjs_claims (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id            UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  clinic_id                 UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id                UUID REFERENCES public.patients(id) ON DELETE CASCADE,

  -- SEP (Surat Eligibilitas Peserta) data
  sep_no                    TEXT,                     -- SEP number from BPJS
  sep_created_at            TIMESTAMPTZ,              -- When SEP was created at BPJS

  -- Clinical coding (ICD-10 for diagnoses, ICD-9-CM for procedures)
  diagnoses                 JSONB DEFAULT '[]',       -- Array of ICD-10 codes with descriptions
  procedures                JSONB DEFAULT '[]',       -- Array of ICD-9-CM codes with descriptions

  -- Claim status tracking
  status                    TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid')),

  -- Timestamps for status changes
  submitted_at              TIMESTAMPTZ,
  approved_at               TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,

  -- Rejection handling
  rejection_reason           TEXT,
  rejected_at               TIMESTAMPTZ,

  -- Financial
  total_claim_amount        DECIMAL(12,2) DEFAULT 0,

  -- Reference numbers for tracking
  bpjs_regsvr_no            TEXT,                     -- Referral number if applicable
  bpjs_sep_kontrol_no       TEXT,                     -- SEP control number for follow-up visits

  -- Metadata
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  created_by                UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE (appointment_id, clinic_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bpjs_claims_clinic_id ON public.bpjs_claims(clinic_id);
CREATE INDEX IF NOT EXISTS idx_bpjs_claims_patient_id ON public.bpjs_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_bpjs_claims_appointment_id ON public.bpjs_claims(appointment_id);
CREATE INDEX IF NOT EXISTS idx_bpjs_claims_status ON public.bpjs_claims(status);
CREATE INDEX IF NOT EXISTS idx_bpjs_claims_sep_no ON public.bpjs_claims(sep_no);
CREATE INDEX IF NOT EXISTS idx_bpjs_claims_created_at ON public.bpjs_claims(created_at);

-- =====================================================
-- TRIGGER: auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_bpjs_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER bpjs_claims_updated_at
  BEFORE UPDATE ON public.bpjs_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_bpjs_claims_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.bpjs_claims ENABLE ROW LEVEL SECURITY;

-- Users can read claims for their clinic
CREATE POLICY "clinic_users_read_bpjs_claims" ON public.bpjs_claims
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status IN ('active', 'pending')
    )
  );

-- Clinic admins can insert/update/delete claims for their clinic
CREATE POLICY "clinic_admins_manage_bpjs_claims" ON public.bpjs_claims
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.clinic_id = bpjs_claims.clinic_id
        AND cu.role IN ('clinic_admin', 'admin')
        AND cu.status = 'active'
    )
  );

-- Patients can read their own claims
CREATE POLICY "patients_read_own_bpjs_claims" ON public.bpjs_claims
  FOR SELECT USING (
    patient_id IN (
      SELECT id FROM public.patients WHERE id = auth.uid()
    )
  );

-- =====================================================
-- COMMON ICD-10 DENTAL CODES (Indonesian BPJS reference)
-- =====================================================
-- These are stored as a reference table for clinics
CREATE TABLE IF NOT EXISTS public.bpjs_icd10_reference (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL,
  description_en  TEXT NOT NULL,
  description_id  TEXT NOT NULL,
  category         TEXT,                              -- e.g., 'Dental', 'Oral Surgery'
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (code)
);

-- Common dental ICD-10 codes for Indonesian BPJS P-Care
INSERT INTO public.bpjs_icd10_reference (code, description_en, description_id, category) VALUES
  ('K01.0', 'Embedded teeth', 'Gigi Impaksi', 'Dental'),
  ('K01.1', 'Supernumerary teeth', 'Gigi Supernumerer', 'Dental'),
  ('K02.0', 'Dental caries limited to enamel', 'Karies Gigi Terbatas pada Email', 'Dental'),
  ('K02.1', 'Dental caries limited to dentine', 'Karies Gigi Terbatas pada Dentin', 'Dental'),
  ('K02.2', 'Dental caries, unspecified', 'Karies Gigi Tidak Specific', 'Dental'),
  ('K02.3', 'Arrested dental caries', 'Karies Gigi Terhenti', 'Dental'),
  ('K02.4', 'Odontoclasia', 'Odontoklasia', 'Dental'),
  ('K02.5', 'Dental caries with pulp involvement', 'Karies Gigi dengan Keterlibatan Pulpa', 'Dental'),
  ('K03.0', 'Excessive attrition of teeth', 'Keausan Gigi Berlebihan', 'Dental'),
  ('K03.1', 'Abrasion of teeth', 'Abrasi Gigi', 'Dental'),
  ('K03.2', 'Erosion of teeth', 'Erosi Gigi', 'Dental'),
  ('K03.3', 'Pathological resorption of teeth', 'Resorpsi Patologis Gigi', 'Dental'),
  ('K03.4', 'Hypercementosis', 'Hipersementosis', 'Dental'),
  ('K03.5', 'Ankylosis of teeth', 'Ankilosis Gigi', 'Dental'),
  ('K03.6', 'Deposits [accretions] on teeth', 'Deposito pada Gigi', 'Dental'),
  ('K03.7', 'Posteruptive color changes of dental tissues', 'Perubahan Warna Gigi Pasca-Erupsi', 'Dental'),
  ('K03.9', 'Disease of hard tissues of teeth, unspecified', 'Penyakit Jaringan Keras Gigi, Tidak Specific', 'Dental'),
  ('K04.0', 'Pulpitis', 'Pulpitis', 'Dental'),
  ('K04.1', 'Necrosis of pulp', 'Nekrosis Pulpa', 'Dental'),
  ('K04.2', 'Dental pulp degeneration', 'Degenerasi Pulpa Gigi', 'Dental'),
  ('K04.3', 'Abnormal hard tissue formation in pulp', 'Pembentukan Jaringan Keras Abnormal pada Pulpa', 'Dental'),
  ('K04.4', 'Acute apical periodontitis', 'Periodontitis Apikal Akut', 'Dental'),
  ('K04.5', 'Chronic apical periodontitis', 'Periodontitis Apikal Kronis', 'Dental'),
  ('K04.6', 'Periapical abscess with sinus', 'Abses Periapikal dengan Sinus', 'Dental'),
  ('K04.7', 'Periapical abscess without sinus', 'Abses Periapikal tanpa Sinus', 'Dental'),
  ('K04.8', 'Radicular cyst', 'Kista Radikuler', 'Dental'),
  ('K04.9', 'Other and unspecified diseases of pulp and periapical tissues', 'Penyakit Pulpa dan Jaringan Periapikal Lainnya', 'Dental'),
  ('K05.0', 'Acute gingivitis', 'Gingivitis Akut', 'Periodontal'),
  ('K05.1', 'Chronic gingivitis', 'Gingivitis Kronis', 'Periodontal'),
  ('K05.2', 'Acute periodontitis', 'Periodontitis Akut', 'Periodontal'),
  ('K05.3', 'Chronic periodontitis', 'Periodontitis Kronis', 'Periodontal'),
  ('K05.4', 'Pyorrhoea alveolaris', 'Pyorrhoea Alveolaris', 'Periodontal'),
  ('K05.5', 'Other periodontal diseases', 'Penyakit Periodontal Lainnya', 'Periodontal'),
  ('K05.6', 'Periodontal disease, unspecified', 'Penyakit Periodontal, Tidak Specific', 'Periodontal'),
  ('K06.0', 'Gingival recession', 'Resesi Gingiva', 'Gingival'),
  ('K06.1', 'Gingival enlargement', 'Pembesaran Gingiva', 'Gingival'),
  ('K06.2', 'Gingival and edentulous alveolar ridge lesions', 'Lesi Gingiva dan Rigde Alveolar Edentulous', 'Gingival'),
  ('K06.8', 'Other specified disorders of gingiva', 'Gangguan Gingiva Lainnya', 'Gingival'),
  ('K06.9', 'Disorder of gingiva, unspecified', 'Gangguan Gingiva, Tidak Specific', 'Gingival'),
  ('K07.0', 'Major anomalies of jaw size', 'Anomali Mayor Ukuran Rahang', 'Orthodontic'),
  ('K07.1', 'Anomalies of jaw-cranial base relationship', 'Anomali Hubungan Rahang-Basis Kranial', 'Orthodontic'),
  ('K07.2', 'Anomalies of dental arch relationship', 'Anomali Hubungan Arkus Dental', 'Orthodontic'),
  ('K07.3', 'Anomalies of tooth position', 'Anomali Posisi Gigi', 'Orthodontic'),
  ('K07.4', 'Malocclusion, unspecified', 'Maloklusi, Tidak Specific', 'Orthodontic'),
  ('K07.5', 'Dentofacial functional abnormalities', 'Kelainan Fungsional Dentofasial', 'Orthodontic'),
  ('K07.6', 'Temporomandibular joint disorders', 'Gangguan Sendi Temporomandibula', 'TMJ'),
  ('K08.0', 'Exfoliation of teeth', 'Eksfoliasi Gigi', 'Dental'),
  ('K08.1', 'Loss of teeth due to trauma', 'Kehilangan Gigi akibat Trauma', 'Dental'),
  ('K08.2', 'Loss of teeth due to periodontal disease', 'Kehilangan Gigi akibat Penyakit Periodontal', 'Dental'),
  ('K08.3', 'Loss of teeth due to dental caries', 'Kehilangan Gigi akibat Karies', 'Dental'),
  ('K08.8', 'Other specified disorders of teeth and supporting structures', 'Gangguan Gigi dan Struktur Penopang Lainnya', 'Dental'),
  ('K08.9', 'Disorder of teeth and supporting structures, unspecified', 'Gangguan Gigi dan Struktur Penopang, Tidak Specific', 'Dental'),
  ('K09.0', 'Developmental odontogenic cysts', 'Kista Odontogenik developmental', 'Cysts'),
  ('K09.1', 'Developmental non-odontogenic cysts', 'Kista Non-Odontogenik Developmental', 'Cysts'),
  ('K09.2', 'Other cysts of jaw', 'Kista Rahang Lainnya', 'Cysts'),
  ('K09.8', 'Other cysts, not elsewhere classified', 'Kista Lainnya', 'Cysts'),
  ('K09.9', 'Cyst, unspecified', 'Kista, Tidak Specific', 'Cysts'),
  ('K10.0', 'Developmental jaw disorders', 'Gangguan Rahang Developmental', 'Jaw'),
  ('K10.1', 'Giant cell granuloma, central', 'Granuloma Sel Raksasa, Sentral', 'Jaw'),
  ('K10.2', 'Inflammatory conditions of jaw', 'Kondisi Inflamasi Rahang', 'Jaw'),
  ('K10.3', 'Alveolitis of jaw', 'Alveolitis Rahang', 'Jaw'),
  ('K10.8', 'Other specified diseases of jaw', 'Penyakit Rahang Lainnya', 'Jaw'),
  ('K10.9', 'Disease of jaw, unspecified', 'Penyakit Rahang, Tidak Specific', 'Jaw'),
  ('K11.0', 'Developmental salivary gland disorders', 'Gangguan Kelenjar Liur Developmental', 'Salivary'),
  ('K11.1', 'Retraction of salivary duct', 'Retraksi Duktus Saliva', 'Salivary'),
  ('K11.2', 'Sialoadenitis', 'Sialoadenitis', 'Salivary'),
  ('K11.3', 'Abscess of salivary gland', 'Abses Kelenjar Liur', 'Salivary'),
  ('K11.4', 'Fistula of salivary gland', 'Fistula Kelenjar Liur', 'Salivary'),
  ('K11.5', 'Sialolithiasis', 'Sialolitiasis', 'Salivary'),
  ('K11.6', 'Mucocele of salivary gland', 'Mukosel Kelenjar Liur', 'Salivary'),
  ('K11.7', 'Disturbances of salivary secretion', 'Gangguan Sekresi Saliva', 'Salivary'),
  ('K11.8', 'Other diseases of salivary glands', 'Penyakit Kelenjar Liur Lainnya', 'Salivary'),
  ('K11.9', 'Disease of salivary gland, unspecified', 'Penyakit Kelenjar Liur, Tidak Specific', 'Salivary'),
  ('K12.0', 'Recurrent oral aphthae', 'Afta Oral Rekuren', 'Oral'),
  ('K12.1', 'Other forms of stomatitis', 'Bentuk Stomatitis Lainnya', 'Oral'),
  ('K12.2', 'Cellulitis and abscess of mouth', 'Selulitis dan Abses Rongga Mulut', 'Oral'),
  ('K12.3', 'Oral mucositis', 'Mukositis Oral', 'Oral'),
  ('K13.0', 'Diseases of lips', 'Penyakit Bibir', 'Oral'),
  ('K13.1', 'Cheek and lip biting', 'Menggigit Pipi dan Bibir', 'Oral'),
  ('K13.2', 'Leukoplakia of oral mucosa', 'Leukoplakia Mukosa Oral', 'Oral'),
  ('K13.3', 'Hairy leukoplakia', 'Leukoplakia Berbulu', 'Oral'),
  ('K13.4', 'Granuloma and granuloma-like lesions of oral mucosa', 'Granuloma dan Lesi Seperti Granuloma', 'Oral'),
  ('K13.5', 'Submucous fibrosis of oral mucosa', 'Fibrosis Submukosa Mukosa Oral', 'Oral'),
  ('K13.6', 'Irritative hyperplasia of oral mucosa', 'Hiperplasia Irritatif Mukosa Oral', 'Oral'),
  ('K13.7', 'Other and unspecified lesions of oral mucosa', 'Lesi Mukosa Oral Lainnya', 'Oral'),
  ('S02.5', 'Fracture of tooth', 'Fraktur Gigi', 'Trauma'),
  ('S02.6', 'Fracture of mandible', 'Fraktur Mandibula', 'Trauma'),
  ('S02.7', 'Multiple fractures involving skull and facial bones', 'Fraktur Multipel Tulang Wajah', 'Trauma')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- COMMON ICD-9-CM DENTAL PROCEDURE CODES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bpjs_icd9cm_reference (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL,
  description_en    TEXT NOT NULL,
  description_id    TEXT NOT NULL,
  category           TEXT,                              -- e.g., 'Extraction', 'Restoration', 'Endodontic'
  bpjs_tariff_group  TEXT,                              -- Group for tariff reference
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (code)
);

-- Common dental ICD-9-CM codes for Indonesian BPJS P-Care
INSERT INTO public.bpjs_icd9cm_reference (code, description_en, description_id, category, bpjs_tariff_group) VALUES
  ('86.0', 'Incision of skin and subcutaneous tissue', 'Insisi Kulit dan Jaringan Subkutan', 'Surgical', 'MINOR_SURGERY'),
  ('86.1', 'Excision of skin lesion', 'Eksisi Lesi Kulit', 'Surgical', 'MINOR_SURGERY'),
  ('86.11', 'Excision of skin lesion', 'Eksisi Lesi Kulit', 'Surgical', 'MINOR_SURGERY'),
  ('86.2', 'Excision or destruction of skin lesion', 'Eksisi atau Destruksi Lesi Kulit', 'Surgical', 'MINOR_SURGERY'),
  ('86.22', 'Excisional debridement of wound', 'Debridement Eksisional Luka', 'Surgical', 'MINOR_SURGERY'),
  ('86.3', 'Destruction of skin lesion', 'Destruksi Lesi Kulit', 'Surgical', 'MINOR_SURGERY'),
  ('86.4', 'Radical excision of skin lesion', 'Eksisi Radikal Lesi Kulit', 'Surgical', 'MINOR_SURGERY'),
  ('23.0', 'Extraction of tooth', 'Ekstraksi Gigi', 'Extraction', 'TOOTH_EXTRACTION'),
  ('23.01', 'Extraction of erupted tooth', 'Ekstraksi Gigi Erupsi', 'Extraction', 'TOOTH_EXTRACTION'),
  ('23.09', 'Extraction of other tooth', 'Ekstraksi Gigi Lainnya', 'Extraction', 'TOOTH_EXTRACTION'),
  ('23.1', 'Root canal therapy', 'Terapi Saluran Akar', 'Endodontic', 'ENDODONTIC'),
  ('23.11', 'Root canal therapy', 'Terapi Saluran Akar', 'Endodontic', 'ENDODONTIC'),
  ('23.2', 'Root canal therapy', 'Terapi Saluran Akar', 'Endodontic', 'ENDODONTIC'),
  ('23.3', 'Pulp capping', 'Capping Pulpa', 'Endodontic', 'ENDODONTIC'),
  ('23.4', 'Pulpectomy', 'Pulpektomi', 'Endodontic', 'ENDODONTIC'),
  ('24.0', 'Removal of embedded tooth', 'Pengangkatan Gigi Impaksi', 'Surgical', 'SURGICAL_EXTRACTION'),
  ('24.1', 'Incision of gum', 'Insisi Gusi', 'Surgical', 'MINOR_SURGERY'),
  ('24.2', 'Dental excision procedures', 'Prosedur Eksisi Dental', 'Surgical', 'MINOR_SURGERY'),
  ('24.3', 'Other incision of gum', 'Insisi Gusi Lainnya', 'Surgical', 'MINOR_SURGERY'),
  ('24.4', 'Excision of gum', 'Eksisi Gusi', 'Surgical', 'GINGIVECTOMY'),
  ('24.5', 'Other repair procedures on gum', 'Prosedur Perbaikan Lain pada Gusi', 'Surgical', 'GINGIVECTOMY'),
  ('24.6', 'Periodontal procedures', 'Prosedur Periodontal', 'Periodontal', 'PERIODONTAL'),
  ('24.7', 'Dental restoration', 'Restorasi Dental', 'Restoration', 'FILLING'),
  ('24.71', 'Filling of tooth', 'Penambalan Gigi', 'Restoration', 'FILLING'),
  ('24.72', 'Other dental restoration', 'Restorasi Dental Lainnya', 'Restoration', 'FILLING'),
  ('24.8', 'Prosthetic dental devices', 'Perangkat Dental Prostetik', 'Prosthetic', 'PROSTHETIC'),
  ('24.9', 'Other dental procedures', 'Prosedur Dental Lainnya', 'Other', 'OTHER'),
  ('40.0', 'Incision of lymphatic structures', 'Insisi Struktur Limfatik', 'Surgical', 'MINOR_SURGERY'),
  ('75.3', 'Repair of dental structures', 'Perbaikan Struktur Dental', 'Restoration', 'FILLING'),
  ('75.4', 'Alveoloplasty', 'Alveoloplasti', 'Surgical', 'ALVEOLOPLASTY'),
  ('75.5', 'Repair of tooth or gum', 'Perbaikan Gigi atau Gusi', 'Surgical', 'MINOR_SURGERY'),
  ('76.0', 'Incision and excision of facial bones', 'Insisi dan Eksisi Tulang Wajah', 'Surgical', 'MAJOR_SURGERY'),
  ('76.1', 'Diagnostic procedures on facial bones', 'Prosedur Diagnostik Tulang Wajah', 'Diagnostic', 'DIAGNOSTIC'),
  ('76.2', 'Local excision of facial bone lesions', 'Eksisi Lokal Lesi Tulang Wajah', 'Surgical', 'MAJOR_SURGERY'),
  ('76.3', 'Partial osteectomy of facial bone', 'Osteektomi Parsial Tulang Wajah', 'Surgical', 'MAJOR_SURGERY'),
  ('76.4', 'Excision of maxilla or mandible', 'Eksisi Maksila atau Mandibula', 'Surgical', 'MAJOR_SURGERY'),
  ('76.5', 'Repair and plastic operations on jaw', 'Perbaikan dan Operasi Plastik Rahang', 'Surgical', 'MAJOR_SURGERY'),
  ('76.6', 'Reduction of jaw dislocation', 'Reduksi Dislokasi Rahang', 'Surgical', 'MINOR_SURGERY'),
  ('76.7', 'Dental implant procedures', 'Prosedur Implant Gigi', 'Implant', 'IMPLANT'),
  ('76.91', 'Immobilization of jaw', 'Imobilisasi Rahang', 'Surgical', 'MINOR_SURGERY'),
  ('76.92', 'Application of maxillofacial prosthesis', 'Aplikasi Prostesis Maksilofasial', 'Prosthetic', 'PROSTHETIC'),
  ('76.93', 'Construction of dental prosthesis', 'Konstruksi Prostesis Dental', 'Prosthetic', 'PROSTHETIC'),
  ('76.94', 'Adjustment of dental prosthesis', 'Penyesuaian Prostesis Dental', 'Prosthetic', 'PROSTHETIC'),
  ('76.95', 'Impression and preparation of dental prosthesis', 'Cetakan dan Persiapan Prostesis Dental', 'Prosthetic', 'PROSTHETIC'),
  ('76.96', 'Orthodontic procedures', 'Prosedur Ortodontik', 'Orthodontic', 'ORTHODONTIC'),
  ('76.97', 'Application of crown', 'Pemasangan Mahkota', 'Prosthetic', 'CROWN'),
  ('76.99', 'Other dental procedures', 'Prosedur Dental Lainnya', 'Other', 'OTHER'),
  ('85.1', 'Diagnostic procedures on breast', 'Prosedur Diagnostik Payudara', 'Diagnostic', 'DIAGNOSTIC'),
  ('85.2', 'Excision or destruction of breast tissue', 'Eksisi atau Destruksi Jaringan Payudara', 'Surgical', 'MAJOR_SURGERY'),
  ('89.0', 'Diagnostic interview and evaluation', 'Wawancara dan Evaluasi Diagnostik', 'Diagnostic', 'CONSULTATION'),
  ('89.1', 'Anthropometric measurements', 'Pengukuran Antropometrik', 'Diagnostic', 'CONSULTATION'),
  ('89.2', 'Clinical精神status examination', 'Pemeriksaan Status Klinis', 'Diagnostic', 'CONSULTATION'),
  ('89.3', 'Other general status examination', 'Pemeriksaan Status Umum Lainnya', 'Diagnostic', 'CONSULTATION'),
  ('89.4', 'Systemic health status assessment', 'Penilaian Status Kesehatan Sistemik', 'Diagnostic', 'CONSULTATION'),
  ('89.5', 'Other diagnostic interview and evaluation', 'Wawancara dan Evaluasi Diagnostik Lainnya', 'Diagnostic', 'CONSULTATION'),
  ('89.6', 'Other diagnostic procedures', 'Prosedur Diagnostik Lainnya', 'Diagnostic', 'DIAGNOSTIC'),
  ('93.0', 'Diagnostic procedures on nervous system', 'Prosedur Diagnostik Sistem Saraf', 'Diagnostic', 'DIAGNOSTIC'),
  ('93.1', 'Functional nerve examination', 'Pemeriksaan Saraf Fungsional', 'Diagnostic', 'CONSULTATION'),
  ('93.2', 'Other nerve function assessment', 'Penilaian Fungsi Saraf Lainnya', 'Diagnostic', 'CONSULTATION'),
  ('93.3', 'Diagnostic procedures on ear', 'Prosedur Diagnostik Telinga', 'Diagnostic', 'DIAGNOSTIC'),
  ('93.4', 'Diagnostic procedures on eye', 'Prosedur Diagnostik Mata', 'Diagnostic', 'DIAGNOSTIC'),
  ('93.5', 'Diagnostic procedures on nose and throat', 'Prosedur Diagnostik Hidung dan Tenggorokan', 'Diagnostic', 'DIAGNOSTIC'),
  ('93.6', 'Diagnostic procedures on mouth and throat', 'Prosedur Diagnostik Mulut dan Tenggorokan', 'Diagnostic', 'DIAGNOSTIC'),
  ('93.7', 'Diagnostic procedures on teeth', 'Prosedur Diagnostik Gigi', 'Diagnostic', 'CONSULTATION'),
  ('93.8', 'History and examination', 'Riwayat dan Pemeriksaan', 'Diagnostic', 'CONSULTATION'),
  ('93.9', 'Other nonoperative measurements and examinations', 'Pengukuran dan Pemeriksaan Non-Operatif Lainnya', 'Diagnostic', 'CONSULTATION')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- ENABLE RLS ON REFERENCE TABLES
-- =====================================================
ALTER TABLE public.bpjs_icd10_reference ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpjs_icd9cm_reference ENABLE ROW LEVEL SECURITY;

-- Everyone can read the reference tables
CREATE POLICY "anyone_read_icd10" ON public.bpjs_icd10_reference FOR SELECT USING (true);
CREATE POLICY "anyone_read_icd9cm" ON public.bpjs_icd9cm_reference FOR SELECT USING (true);

-- Only admins can modify reference tables
CREATE POLICY "admins_manage_icd10" ON public.bpjs_icd10_reference
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND role IN ('clinic_admin', 'admin')
        AND status = 'active'
    )
  );

CREATE POLICY "admins_manage_icd9cm" ON public.bpjs_icd9cm_reference
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND role IN ('clinic_admin', 'admin')
        AND status = 'active'
    )
  );

-- =====================================================
-- GRANTS FOR SUPABASE SERVICE ROLE
-- =====================================================
-- Note: The service role key has full access by default
-- These grants ensure proper access patterns

GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
