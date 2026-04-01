-- pg_cron Reminder Scheduling Migration
-- Automated appointment reminder dispatch using pg_cron

-- Enable pg_cron extension (run once per database)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant permission for pg_cron to run functions
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA cron TO postgres;

-- =====================================================
-- FUNCTION: Send appointment reminders
-- =====================================================
-- This function is called by pg_cron to send reminders based on schedule

CREATE OR REPLACE FUNCTION cron.send_appointment_reminders()
RETURNS void AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
  v_48h_before TIMESTAMPTZ;
  v_24h_before TIMESTAMPTZ;
  v_2h_before TIMESTAMPTZ;
  v_appointment RECORD;
  v_template_id UUID;
  v_template RECORD;
  v_patient RECORD;
  v_doctor RECORD;
  v_service RECORD;
  v_message TEXT;
  v_sent BOOLEAN;
BEGIN
  -- Calculate time windows
  v_48h_before := v_now + INTERVAL '48 hours';
  v_24h_before := v_now + INTERVAL '24 hours';
  v_2h_before := v_now + INTERVAL '2 hours';

  -- Get the reminder template for WhatsApp
  SELECT * INTO v_template FROM communication_templates
  WHERE type = 'reminder' AND channel = 'whatsapp' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'No active WhatsApp reminder template found';
    RETURN;
  END IF;

  -- Process appointments needing 48h reminder
  FOR v_appointment IN
    SELECT a.*, p.phone as patient_phone, p.email as patient_email, p.full_name as patient_name,
           u.full_name as doctor_name, s.name as service_name,
           (a.appointment_date || ' ' || a.appointment_time)::timestamptz as appointment_datetime
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON a.doctor_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.status = 'Confirmed'
      AND a.reminder_status = 'pending'
      AND a.appointment_date IS NOT NULL
      AND a.appointment_time IS NOT NULL
      AND (a.appointment_date || ' ' || a.appointment_time)::timestamptz BETWEEN v_now AND v_48h_before
      AND a.whatsapp_reminder_sent = false
  LOOP
    -- Replace template variables
    v_message := v_template.body;
    v_message := REPLACE(v_message, '{{patient_name}}', v_appointment.patient_name);
    v_message := REPLACE(v_message, '{{appointment_date}}', TO_CHAR(v_appointment.appointment_date, 'DD/MM/YYYY'));
    v_message := REPLACE(v_message, '{{appointment_time}}', SUBSTR(v_appointment.appointment_time::text, 1, 5));
    v_message := REPLACE(v_message, '{{doctor_name}}', v_appointment.doctor_name);
    v_message := REPLACE(v_message, '{{service_name}}', v_appointment.service_name);

    -- Send WhatsApp message (simulated - integrate with 360dialog in production)
    v_sent := false;
    -- In production, uncomment and configure:
    -- PERFORM send_whatsapp_message(v_appointment.patient_phone, v_message);
    RAISE NOTICE 'Sending 48h reminder to % for appointment %', v_appointment.patient_phone, v_appointment.id;

    -- Log the communication
    INSERT INTO communication_log (patient_id, appointment_id, channel, template_id, recipient, message, status, sent_at)
    VALUES (v_appointment.patient_id, v_appointment.id, 'whatsapp', v_template.id, v_appointment.patient_phone, v_message, 'sent', v_now);

    -- Update appointment reminder status
    UPDATE appointments SET reminder_status = 'sent_48h', whatsapp_reminder_sent = true WHERE id = v_appointment.id;
  END LOOP;

  -- Process appointments needing 24h reminder
  FOR v_appointment IN
    SELECT a.*, p.phone as patient_phone, p.email as patient_email, p.full_name as patient_name,
           u.full_name as doctor_name, s.name as service_name,
           (a.appointment_date || ' ' || a.appointment_time)::timestamptz as appointment_datetime
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON a.doctor_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.status = 'Confirmed'
      AND a.reminder_status = 'sent_48h'
      AND a.appointment_date IS NOT NULL
      AND a.appointment_time IS NOT NULL
      AND (a.appointment_date || ' ' || a.appointment_time)::timestamptz BETWEEN v_now AND v_24h_before
      AND a.whatsapp_reminder_sent = true
      AND a.sms_reminder_sent = false
  LOOP
    RAISE NOTICE 'Sending 24h reminder to % for appointment %', v_appointment.patient_phone, v_appointment.id;

    INSERT INTO communication_log (patient_id, appointment_id, channel, template_id, recipient, message, status, sent_at)
    VALUES (v_appointment.patient_id, v_appointment.id, 'sms', v_template.id, v_appointment.patient_phone, v_message, 'sent', v_now);

    UPDATE appointments SET reminder_status = 'sent_24h', sms_reminder_sent = true WHERE id = v_appointment.id;
  END LOOP;

  -- Process appointments needing 2h reminder
  FOR v_appointment IN
    SELECT a.*, p.phone as patient_phone, p.email as patient_email, p.full_name as patient_name,
           u.full_name as doctor_name, s.name as service_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    JOIN users u ON a.doctor_id = u.id
    JOIN services s ON a.service_id = s.id
    WHERE a.status = 'Confirmed'
      AND a.reminder_status = 'sent_24h'
      AND a.appointment_date IS NOT NULL
      AND a.appointment_time IS NOT NULL
      AND (a.appointment_date || ' ' || a.appointment_time)::timestamptz BETWEEN v_now AND v_2h_before
      AND a.email_reminder_sent = false
  LOOP
    RAISE NOTICE 'Sending 2h reminder to % for appointment %', v_appointment.patient_email, v_appointment.id;

    INSERT INTO communication_log (patient_id, appointment_id, channel, template_id, recipient, message, status, sent_at)
    VALUES (v_appointment.patient_id, v_appointment.id, 'email', v_template.id, v_appointment.patient_email, v_message, 'sent', v_now);

    UPDATE appointments SET reminder_status = 'sent_2h', email_reminder_sent = true WHERE id = v_appointment.id;
  END LOOP;

  -- Mark no-shows (appointments that have passed without confirmation)
  UPDATE appointments
  SET reminder_status = 'no_show'
  WHERE status = 'Confirmed'
    AND reminder_status NOT IN ('confirmed', 'no_show', 'cancelled')
    AND appointment_date IS NOT NULL
    AND appointment_time IS NOT NULL
    AND (appointment_date || ' ' || appointment_time)::timestamptz < v_now - INTERVAL '30 minutes';

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Send NPS surveys 24h after appointment
-- =====================================================

CREATE OR REPLACE FUNCTION cron.send_nps_surveys()
RETURNS void AS $$
DECLARE
  v_appointment RECORD;
  v_template RECORD;
  v_message TEXT;
  v_patient RECORD;
BEGIN
  -- Get NPS template
  SELECT * INTO v_template FROM communication_templates
  WHERE type = 'nps' AND channel = 'whatsapp' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'No active NPS template found';
    RETURN;
  END IF;

  -- Send NPS to patients 24h after their appointment
  FOR v_appointment IN
    SELECT a.*, p.phone, p.email, p.full_name
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.status = 'Selesai'
      AND a.nps_sent = false
      AND a.completed_at IS NOT NULL
      AND a.completed_at < now() - INTERVAL '24 hours'
      AND a.completed_at > now() - INTERVAL '72 hours' -- Only within 72h window
  LOOP
    v_message := v_template.body;
    v_message := REPLACE(v_message, '{{patient_name}}', v_appointment.full_name);
    v_message := REPLACE(v_message, '{{appointment_date}}', TO_CHAR(v_appointment.appointment_date, 'DD/MM/YYYY'));
    v_message := REPLACE(v_message, '{{doctor_name}}', COALESCE(v_appointment.doctor_name, ''));

    -- Send NPS survey
    INSERT INTO communication_log (patient_id, appointment_id, channel, template_id, recipient, message, status, sent_at)
    VALUES (v_appointment.patient_id, v_appointment.id, 'whatsapp', v_template.id, v_appointment.phone, v_message, 'sent', now());

    UPDATE appointments SET nps_sent = true WHERE id = v_appointment.id;

    RAISE NOTICE 'Sent NPS survey to % for appointment %', v_appointment.phone, v_appointment.id;
  END LOOP;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Process recall campaigns
-- =====================================================

CREATE OR REPLACE FUNCTION cron.process_recall_campaigns()
RETURNS void AS $$
DECLARE
  v_patient RECORD;
  v_template RECORD;
  v_message TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Get recall template
  SELECT * INTO v_template FROM communication_templates
  WHERE type = 'recall' AND channel = 'whatsapp' AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE NOTICE 'No active recall template found';
    RETURN;
  END IF;

  -- Process patients who are overdue for recall
  FOR v_patient IN
    SELECT p.*, c.body as template_body
    FROM patients p, communication_templates c
    WHERE p.recall_status IN ('overdue_6m', 'overdue_12m', 'dormant')
      AND p.phone IS NOT NULL
      AND p.patient_portal_active = false -- Only patients not already in portal
      AND NOT EXISTS (
        SELECT 1 FROM communication_log cl
        WHERE cl.patient_id = p.id
          AND cl.template_id = c.id
          AND cl.created_at > now() - INTERVAL '30 days'
      )
      AND c.type = 'recall'
      AND c.channel = 'whatsapp'
      AND c.is_active = true
    LIMIT 100 -- Process in batches of 100
  LOOP
    v_message := v_template.body;
    v_message := REPLACE(v_message, '{{patient_name}}', v_patient.full_name);
    v_message := REPLACE(v_message, '{{booking_link}}', 'https://denticare.pro/booking');

    -- Send recall message
    INSERT INTO communication_log (patient_id, channel, template_id, recipient, message, status, sent_at)
    VALUES (v_patient.id, 'whatsapp', v_template.id, v_patient.phone, v_message, 'sent', now());

    -- Update patient recall status to contacted
    UPDATE patients SET recall_status = 'contacted' WHERE id = v_patient.id;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Processed % recall messages', v_count;

END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SCHEDULE: Configure pg_cron jobs
-- =====================================================

-- Remove existing jobs if they exist (idempotent)
SELECT cron.unschedule('appointment-reminders');
SELECT cron.unschedule('nps-surveys');
SELECT cron.unschedule('recall-campaigns');

-- Schedule appointment reminders to run every 15 minutes
SELECT cron.schedule(
  'appointment-reminders',
  '*/15 * * * *', -- Every 15 minutes
  'SELECT cron.send_appointment_reminders()'
);

-- Schedule NPS surveys to run every hour
SELECT cron.schedule(
  'nps-surveys',
  '0 * * * *', -- Every hour
  'SELECT cron.send_nps_surveys()'
);

-- Schedule recall campaigns to run daily at 9 AM
SELECT cron.schedule(
  'recall-campaigns',
  '0 9 * * *', -- Daily at 9 AM
  'SELECT cron.process_recall_campaigns()'
);

-- =====================================================
-- VERIFICATION: Check scheduled jobs
-- =====================================================

SELECT * FROM cron.job ORDER BY jobname;