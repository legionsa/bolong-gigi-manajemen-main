-- =====================================================
-- SURAT IZIN & NOTA/KWITANSI TABLES
-- Phase: New Feature
-- =====================================================

-- =====================================================
-- 1. ADD COLUMNS TO CLINIC_SETTINGS
-- =====================================================
ALTER TABLE public.clinic_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.clinic_settings ADD COLUMN IF NOT EXISTS operational_permit_number TEXT;
ALTER TABLE public.clinic_settings ADD COLUMN IF NOT EXISTS clinic_slogan TEXT;

-- =====================================================
-- 2. ICD-10 CODES TABLE (seeded with dental codes)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.icd10_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL,
  description  TEXT NOT NULL,
  category     TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_icd10_codes_code ON public.icd10_codes(code);
CREATE INDEX IF NOT EXISTS idx_icd10_codes_desc ON public.icd10_codes(description);

-- Seed common dental ICD-10-CM codes (K00-K14 range)
INSERT INTO public.icd10_codes (code, description, category) VALUES
  ('K00.0', 'Anodontia (gigi tidak tumbuh)', 'Gangguan Perkembangan Gigi'),
  ('K00.1', 'Supernumerary teeth (gigi tambahan)', 'Gangguan Perkembangan Gigi'),
  ('K00.2', 'Abnormalitas ukuran dan bentuk gigi', 'Gangguan Perkembangan Gigi'),
  ('K00.3', 'Macrodontia (gigi besar abnormal)', 'Gangguan Perkembangan Gigi'),
  ('K00.4', 'Dysplasia dentin (kekerasan dentin abnormal)', 'Gangguan Perkembangan Gigi'),
  ('K00.5', 'Hereditary dysplasia dentin', 'Gangguan Perkembangan Gigi'),
  ('K00.6', 'Disturbs in tooth eruption (gangguan eruptasi)', 'Gangguan Perkembangan Gigi'),
  ('K00.7', 'Teething syndrome', 'Gangguan Perkembangan Gigi'),
  ('K00.8', 'Gangguan perkembangan gigi lainnya', 'Gangguan Perkembangan Gigi'),
  ('K00.9', 'Gangguan perkembangan gigi, tidak spesifik', 'Gangguan Perkembangan Gigi'),
  ('K01.0', 'Embedded teeth (gigi terbenam)', 'Gangguan Perkembangan Gigi'),
  ('K01.1', 'Impacted teeth (gigi impaksi)', 'Gangguan Perkembangan Gigi'),
  ('K02.0', 'Caries awal (Early childhood caries)', 'Karies Gigi'),
  ('K02.1', 'Dental caries (karies gigi)', 'Karies Gigi'),
  ('K02.2', 'Caries of cementum (karies semen)', 'Karies Gigi'),
  ('K02.3', 'Arrested dental caries (karies berhenti)', 'Karies Gigi'),
  ('K02.4', 'Odontoclasia', 'Karies Gigi'),
  ('K02.5', 'Dental caries, unspecified', 'Karies Gigi'),
  ('K03.0', 'Attritional wear (keausan gigi)', 'Penyakit Gigi Lainnya'),
  ('K03.1', 'Abrasion (abrasi gigi)', 'Penyakit Gigi Lainnya'),
  ('K03.2', 'Erosion (erosi gigi)', 'Penyakit Gigi Lainnya'),
  ('K03.3', 'Pathological resorption (resorbsi patologis)', 'Penyakit Gigi Lainnya'),
  ('K03.4', 'Hypercementosis', 'Penyakit Gigi Lainnya'),
  ('K03.5', 'Ankylosis of teeth (ankilosis gigi)', 'Penyakit Gigi Lainnya'),
  ('K03.6', 'Deposits (acula) on teeth', 'Penyakit Gigi Lainnya'),
  ('K03.7', 'Changes in tooth hard tissue (perubahan jaringan keras)', 'Penyakit Gigi Lainnya'),
  ('K03.8', 'Penyakit jaringan keras gigi lainnya', 'Penyakit Gigi Lainnya'),
  ('K03.9', 'Penyakit jaringan keras gigi, tidak spesifik', 'Penyakit Gigi Lainnya'),
  ('K04.0', 'Pulpitis (radang pulpa)', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.1', 'Reversible pulpitis (pulpitis reversibel)', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.2', 'Irreversible pulpitis (pulpitis ireversibel)', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.3', 'Abnormal pulp calcifications', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.4', 'Acellular cementum apoptosis', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.5', 'Periapical abscess with sinus (abses periapikal dengan sinus)', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.6', 'Periapical abscess without sinus (abses periapikal tanpa sinus)', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.7', 'Periapical abscess with fistula', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.8', 'Radicular cyst (kista radikular)', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K04.9', 'Penyakit pulpa dan jaringan periapikal lainnya', 'Penyakit Pulpa dan Jaringan Periapikal'),
  ('K05.0', 'Acute gingivitis (gingivitis akut)', 'Penyakit Gingiva dan Periodontal'),
  ('K05.1', 'Chronic gingivitis (gingivitis kronis)', 'Penyakit Gingiva dan Periodontal'),
  ('K05.2', 'Acute periodontitis (periodontitis akut)', 'Penyakit Gingiva dan Periodontal'),
  ('K05.3', 'Chronic periodontitis (periodontitis kronis)', 'Penyakit Gingiva dan Periodontal'),
  ('K05.4', 'Periodontal abscess (abses periodontal)', 'Penyakit Gingiva dan Periodontal'),
  ('K05.5', 'Other periodontal diseases', 'Penyakit Gingiva dan Periodontal'),
  ('K05.6', 'Periodontal disease, unspecified', 'Penyakit Gingiva dan Periodontal'),
  ('K06.0', 'Gingival recession (resesi gingiva)', 'Penyakit Gingiva dan Periodontal'),
  ('K06.1', 'Gingival enlargement (pembesaran gingiva)', 'Penyakit Gingiva dan Periodontal'),
  ('K06.2', 'Gingival and edentulous alveolar ridge lesions', 'Penyakit Gingiva dan Periodontal'),
  ('K06.8', 'Gangguan gingiva dan ridge edentulous lainnya', 'Penyakit Gingiva dan Periodontal'),
  ('K06.9', 'Gangguan gingiva, tidak spesifik', 'Penyakit Gingiva dan Periodontal'),
  ('K07.0', 'Malocclusion, unspecified (maloklusi)', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.1', 'Anomaliijaw size (anomali ukuran rahang)', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.2', 'Anomalies of dental arch relationship', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.3', 'Anomalies of tooth position (anomali posisi gigi)', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.4', 'Malocclusion, unspecified', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.5', 'Dentofacial functional abnormalities', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.6', 'Temporomandibular joint disorders (gangguan sendi temporomandibula)', 'Ortodonti dan Anomali Dentofasial'),
  ('K07.8', 'Anomali dentofasial lainnya', 'Ortodonti dan Anomali Dentofasial'),
  ('K08.0', 'Exfoliation of teeth due to systemic causes', 'Kondisi Gigi Lainnya'),
  ('K08.1', 'Loss of teeth due to accident, extraction, or periodontal disease', 'Kondisi Gigi Lainnya'),
  ('K08.2', 'Atrophy of edentulous ridge (atrofi ridge edentulous)', 'Kondisi Gigi Lainnya'),
  ('K08.3', 'Retained dental root (akar gigi tertinggal)', 'Kondisi Gigi Lainnya'),
  ('K08.4', 'Partial loss of teeth (hilangnya sebagian gigi)', 'Kondisi Gigi Lainnya'),
  ('K08.5', 'Unspecified difficulty in denture', 'Kondisi Gigi Lainnya'),
  ('K08.8', 'Kondisi gigi dan supporting structures lainnya', 'Kondisi Gigi Lainnya'),
  ('K08.9', 'Disorder of teeth and supporting structures, unspecified', 'Kondisi Gigi Lainnya'),
  ('K09.0', 'Developmental odontogenic cysts (kista odontogenik developmental)', 'Kista Rongga Mulut'),
  ('K09.1', 'Developmental (nonodontogenic) cysts of mouth', 'Kista Rongga Mulut'),
  ('K09.2', 'Other cysts of oral cavity', 'Kista Rongga Mulut'),
  ('K09.8', 'Cysts of oral region, unspecified', 'Kista Rongga Mulut'),
  ('K09.9', 'Cysts of oral region in diseases classified elsewhere', 'Kista Rongga Mulut'),
  ('K10.0', 'Developmental disorders of jaw bone', 'Penyakit Tulang Rahang'),
  ('K10.1', 'Giant cell granuloma, central (granuloma sel raksasa sentral)', 'Penyakit Tulang Rahang'),
  ('K10.2', 'Inflammatory conditions of jaw (kondisi inflamasi rahang)', 'Penyakit Tulang Rahang'),
  ('K10.3', 'Alveolitis of jaw (alveolitis rahang)', 'Penyakit Tulang Rahang'),
  ('K10.8', 'Penyakit tulang rahang lainnya', 'Penyakit Tulang Rahang'),
  ('K10.9', 'Penyakit tulang rahang, tidak spesifik', 'Penyakit Tulang Rahang'),
  ('K11.0', 'Atrophy of salivary gland (atrofi kelenjar saliva)', 'Penyakit Kelenjar Liur'),
  ('K11.1', 'Hypertrophy of salivary gland (hipertrofi kelenjar liur)', 'Penyakit Kelenjar Liur'),
  ('K11.2', 'Sialoadenitis (radang kelenjar liur)', 'Penyakit Kelenjar Liur'),
  ('K11.3', 'Abscess of salivary gland (abses kelenjar liur)', 'Penyakit Kelenjar Liur'),
  ('K11.4', 'Fistula of salivary gland (fistula kelenjar liur)', 'Penyakit Kelenjar Liur'),
  ('K11.5', 'Sialolithiasis (batu kelenjar liur)', 'Penyakit Kelenjar Liur'),
  ('K11.6', 'Mucocele of salivary gland (mukosel kelenjar liur)', 'Penyakit Kelenjar Liur'),
  ('K11.7', 'Disturbances of salivary secretion', 'Penyakit Kelenjar Liur'),
  ('K11.8', 'Penyakit kelenjar liur lainnya', 'Penyakit Kelenjar Liur'),
  ('K11.9', 'Penyakit kelenjar liur, tidak spesifik', 'Penyakit Kelenjar Liur'),
  ('K12.0', 'Recurrent oral aphthae (stomatitis afta rekuren)', 'Penyakit Rongga Mulut Lainnya'),
  ('K12.1', 'Other forms of stomatitis', 'Penyakit Rongga Mulut Lainnya'),
  ('K12.2', 'Cellulitis and abscess of mouth (selulitis dan abses mulut)', 'Penyakit Rongga Mulut Lainnya'),
  ('K12.3', 'Oral mucositis (mukositis oral)', 'Penyakit Rongga Mulut Lainnya'),
  ('K12.8', 'Penyakit rongga mulut lainnya', 'Penyakit Rongga Mulut Lainnya'),
  ('K12.9', 'Penyakit rongga mulut, tidak spesifik', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.0', 'Diseases of lips (penyakit bibir)', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.1', 'Cheek biting (penggigitan pipi)', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.2', 'Leukoplakia and other disturbances of oral epithelium', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.3', 'Hairy leukoplakia', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.4', 'Granuloma and granuloma-like lesions of oral mucosa', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.5', 'Submucous fibrosis of oral cavity', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.6', 'Irritative hyperplasia of oral mucosa', 'Penyakit Rongga Mulut Lainnya'),
  ('K13.7', 'Other and unspecified lesions of oral mucosa', 'Penyakit Rongga Mulut Lainnya'),
  ('K14.0', 'Glossitis (radang lidah)', 'Penyakit Lidah'),
  ('K14.1', 'Geographic tongue (lidah geografis)', 'Penyakit Lidah'),
  ('K14.2', 'Median rhomboid glossitis', 'Penyakit Lidah'),
  ('K14.3', 'Hypertrophy of tongue papillae', 'Penyakit Lidah'),
  ('K14.4', 'Atrophy of tongue papillae', 'Penyakit Lidah'),
  ('K14.5', 'Plicated tongue', 'Penyakit Lidah'),
  ('K14.6', 'Glossodynia (nyeri lidah)', 'Penyakit Lidah'),
  ('K14.8', 'Penyakit lidah lainnya', 'Penyakit Lidah'),
  ('K14.9', 'Penyakit lidah, tidak spesifik', 'Penyakit Lidah')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. SURAT IZIN TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.surat_izin_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  header_text TEXT,
  body_text   TEXT NOT NULL,
  footer_text TEXT,
  is_default  BOOLEAN DEFAULT FALSE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surat_izin_templates_clinic ON public.surat_izin_templates(clinic_id);

-- Create default template for each new clinic
CREATE OR REPLACE FUNCTION public.create_default_surat_izin_template(p_clinic_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.surat_izin_templates (clinic_id, name, header_text, body_text, footer_text, is_default)
  VALUES (
    p_clinic_id,
    'Surat Izin Standar',
    'KLINIK GIGI [NAMA KLINIK]
    [ALAMAT KLINIK]
    Telp: [NOMOR TELEPON]

    NOMOR IZIN OPERASIONAL: [NOMOR IZIN]

    --- header template ---',
    'Yang bertanda tangan di bawah ini, Dokter Gigi yang praktik di [NAMA KLINIK], dengan ini menyatakan bahwa:

    Nama Pasien: [NAMA PASIEN]
    NIK: [NOMOR NIK]
    Alamat: [ALAMAT PASIEN]

    telah melakukan pemeriksaan dan/atau perawatan kesehatan gigi dan mulut pada tanggal [TANGGAL PERIKSA].

    Diagnosis: [DIAGNOSIS ICD-10: kode - deskripsi]

   Berdasarkan pemeriksaan tersebut, pasien tersebut di atas diperbolehkan untuk [KEPERLUAN SURAT IZIN].

    Surat izin ini diberikan untuk keperluan: [KEPERLUAN] dan dapat digunakan sebagaimana mestinya.

    Hormat kami,
    Dokter Gigi yang merawat,


    _______________
    [NAMA DOKTER]
    SIP: [NOMOR SIP]
    STR: [NOMOR STR]',
    'Klinik Gigi DentiCare Pro
    Dikeluarkan di: [NAMA KLINIK]
    Tanggal: [TANGGAL SURAT]

    Surat ini dapat digunakan untuk keperluan administrasi kantor/pabrik.
   --- footer template ---',
    TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. SURAT IZIN DOCUMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.surat_izin_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  template_id     UUID REFERENCES public.surat_izin_templates(id) ON DELETE SET NULL,
  patient_name    TEXT,
  patient_nik     TEXT,
  patient_address TEXT,
  diagnosis       TEXT,
  icd10_code      TEXT,
  icd10_desc      TEXT,
  letter_date     DATE,
  letter_text     TEXT,
  signature_name  TEXT,
  keperluan       TEXT,  -- purpose of the letter (office, bpjs, etc.)
  status          TEXT DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surat_izin_documents_clinic ON public.surat_izin_documents(clinic_id);
CREATE INDEX IF NOT EXISTS idx_surat_izin_documents_patient ON public.surat_izin_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_surat_izin_documents_doctor ON public.surat_izin_documents(doctor_id);
CREATE INDEX IF NOT EXISTS idx_surat_izin_documents_date ON public.surat_izin_documents(letter_date);

-- =====================================================
-- 5. NOTA/KWITANSI TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.nota_kwitansi (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id  UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  patient_id      UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  invoice_id      UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  invoice_number  TEXT,
  amount_total    INTEGER DEFAULT 0,
  amount_discount INTEGER DEFAULT 0,
  amount_final    INTEGER DEFAULT 0,
  payment_method  TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'active',
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nota_kwitansi_clinic ON public.nota_kwitansi(clinic_id);
CREATE INDEX IF NOT EXISTS idx_nota_kwitansi_patient ON public.nota_kwitansi(patient_id);
CREATE INDEX IF NOT EXISTS idx_nota_kwitansi_date ON public.nota_kwitansi(created_at);

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

-- surat_izin_templates RLS
ALTER TABLE public.surat_izin_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surat_izin_templates_all" ON public.surat_izin_templates;
CREATE POLICY "surat_izin_templates_all" ON public.surat_izin_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = surat_izin_templates.clinic_id
        AND status = 'active'
    )
  );

-- surat_izin_documents RLS
ALTER TABLE public.surat_izin_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "surat_izin_documents_all" ON public.surat_izin_documents;
CREATE POLICY "surat_izin_documents_all" ON public.surat_izin_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = surat_izin_documents.clinic_id
        AND status = 'active'
    )
  );

-- nota_kwitansi RLS
ALTER TABLE public.nota_kwitansi ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nota_kwitansi_all" ON public.nota_kwitansi;
CREATE POLICY "nota_kwitansi_all" ON public.nota_kwitansi
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = nota_kwitansi.clinic_id
        AND status = 'active'
    )
  );

-- icd10_codes RLS (readable by all authenticated)
ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "icd10_codes_read_all" ON public.icd10_codes;
CREATE POLICY "icd10_codes_read_all" ON public.icd10_codes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 7. UPDATED_AT TRIGGERS
-- =====================================================
CREATE OR REPLACE TRIGGER surat_izin_templates_updated_at
  BEFORE UPDATE ON public.surat_izin_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER surat_izin_documents_updated_at
  BEFORE UPDATE ON public.surat_izin_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER nota_kwitansi_updated_at
  BEFORE UPDATE ON public.nota_kwitansi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
