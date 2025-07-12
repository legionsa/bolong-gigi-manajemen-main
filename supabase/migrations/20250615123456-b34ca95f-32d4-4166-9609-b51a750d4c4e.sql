
-- Allow date to be nullable and add day_of_week for recurring schedules
ALTER TABLE public.doctor_schedules
ADD COLUMN day_of_week INTEGER;

ALTER TABLE public.doctor_schedules
ALTER COLUMN date DROP NOT NULL;

-- Add constraint for day_of_week value (1=Monday, 7=Sunday)
ALTER TABLE public.doctor_schedules
ADD CONSTRAINT doctor_schedules_day_of_week_check
CHECK (day_of_week IS NULL OR (day_of_week >= 1 AND day_of_week <= 7));

-- Ensure one of date or day_of_week is provided for a schedule
ALTER TABLE public.doctor_schedules
ADD CONSTRAINT date_or_day_of_week_check
CHECK (date IS NOT NULL OR day_of_week IS NOT NULL);
