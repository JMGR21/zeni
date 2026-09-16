-- Tercera modalidad de deuda: plazo fijo semanal (ej. préstamo personal de
-- Banco Azteca, pero genérico para cualquier deuda con esta estructura). El
-- banco ya da directamente el costo total y el saldo de liquidación
-- anticipada — no hay que proyectar nada con debt-projection.ts, solo
-- mostrar los datos correctamente.
alter table public.dragons
  add column payment_schedule text check (payment_schedule in ('amortized', 'fixed_plan', 'fixed_weekly')),
  add column principal_amount numeric(12, 2),      -- monto de disposición original
  add column weekly_payment numeric(12, 2),        -- pago fijo semanal
  add column total_installments integer,           -- plazo total en semanas
  add column payment_day_of_week integer check (payment_day_of_week between 0 and 6), -- 0=domingo...6=sábado
  add column disbursement_date date,               -- fecha de disposición
  add column payoff_today_amount numeric(12, 2),   -- saldo de liquidación anticipada, dato manual
  add column payoff_today_updated_at timestamp with time zone;

-- Backfill de deudas existentes para no dejar el campo nuevo en null sin sentido
update public.dragons set payment_schedule = 'fixed_plan' where type = 'debt' and institution in ('kueski', 'aplazo');
update public.dragons set payment_schedule = 'amortized' where type = 'debt' and payment_schedule is null;
