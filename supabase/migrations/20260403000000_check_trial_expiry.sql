-- Add trial expiry check job (runs daily at midnight)
SELECT cron.schedule(
  'check-trial-expiry',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.external_webhook_url') || '/functions/v1/check-trial-expiry',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}',
    body := '{"test": true}'
  );
  $$
);

-- Unschedule if needed:
-- SELECT cron.unschedule('check-trial-expiry');