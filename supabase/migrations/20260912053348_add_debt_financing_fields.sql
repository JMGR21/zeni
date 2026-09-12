alter table public.dragons
  add column interest_rate numeric(6, 3),   -- tasa anual (%), null = sin interés (deuda personalizada sin interés)
  add column minimum_payment numeric(12, 2),
  add column extra_payment numeric(12, 2) not null default 0;
