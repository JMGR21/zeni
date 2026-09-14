-- Corrige los nombres de secretos de Vault que referencia el cron job
-- `process-recurring-transactions-daily` (creado en
-- `schedule_recurring_transactions_processing.sql`) para que coincidan con
-- los declarados en `supabase/config.toml` bajo `[db.vault]`
-- (`process_recurring_project_url` en vez de `project_url`) — ese archivo
-- se sincroniza automáticamente a Vault en cada `supabase db push`, así que
-- el nombre del secreto en la llamada HTTP debe coincidir exactamente con
-- la clave usada ahí, sin necesidad de crear el secreto manualmente por SQL.
--
-- `cron.schedule` con el mismo nombre de Job reemplaza (upsert) la
-- definición anterior en vez de crear un job duplicado.

select
  cron.schedule(
    'process-recurring-transactions-daily',
    '0 6 * * *', -- todos los días a las 6:00am UTC
    $$
    select
      net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'process_recurring_project_url') || '/functions/v1/process-recurring-transactions',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'process_recurring_secret_key')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
      ) as request_id;
    $$
  );
