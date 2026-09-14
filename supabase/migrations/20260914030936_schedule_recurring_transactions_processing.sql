-- Programa la Edge Function `process-recurring-transactions` para correr
-- todos los días a las 6:00am UTC vía pg_cron + pg_net.
--
-- Esta migración NO crea los secretos de Vault que la llamada referencia
-- (`project_url` y `process_recurring_secret_key`) porque hacerlo requeriría
-- escribir el valor real de la secret key en texto plano en un archivo
-- versionado en git — exactamente lo que se quiere evitar. Antes de aplicar
-- esta migración, corre una sola vez en el SQL Editor del dashboard (no en
-- una migración) reemplazando los placeholders por los valores reales de
-- Settings > API > Project URL y Settings > API Keys > secret key:
--
--   select vault.create_secret('https://tu-project-ref.supabase.co', 'project_url');
--   select vault.create_secret('sb_secret_...', 'process_recurring_secret_key');
--
-- Si alguno de los dos secretos ya existe (por ejemplo, se actualizó la
-- secret key), usa vault.update_secret con el id existente en vez de
-- create_secret otra vez (create_secret con el mismo `name` falla).

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select
  cron.schedule(
    'process-recurring-transactions-daily',
    '0 6 * * *', -- todos los días a las 6:00am UTC
    $$
    select
      net.http_post(
          url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/process-recurring-transactions',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'process_recurring_secret_key')
          ),
          body := '{}'::jsonb,
          timeout_milliseconds := 30000
      ) as request_id;
    $$
  );
