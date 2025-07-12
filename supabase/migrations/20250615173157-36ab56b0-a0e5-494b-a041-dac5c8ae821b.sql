
ALTER TABLE public.patients
ADD COLUMN patient_number TEXT,
ADD COLUMN place_of_birth TEXT;

ALTER TABLE public.patients
ADD CONSTRAINT patient_number_unique UNIQUE (patient_number);
