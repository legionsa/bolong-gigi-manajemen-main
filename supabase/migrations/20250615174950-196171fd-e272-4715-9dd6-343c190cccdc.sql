
ALTER TABLE public.medical_records
ADD COLUMN blood_type TEXT,
ADD COLUMN odontogram_chart_url TEXT,
ADD COLUMN history_conditions TEXT[],
ADD COLUMN covid19_vaccinated BOOLEAN,
ADD COLUMN drug_allergies TEXT[];
