
ALTER TABLE public.medical_records
RENAME COLUMN odontogram_chart_url TO odontogram_data;

ALTER TABLE public.medical_records
ALTER COLUMN odontogram_data TYPE JSONB USING NULL;
