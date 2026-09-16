-- Saldo que el usuario tenía antes de empezar a usar Zeni. Se captura una
-- sola vez en Configuración (aunque se puede corregir después) y alimenta
-- el cálculo de Saldo Total/Disponible — no toca el balance mensual que ya
-- usan Ki/Presupuesto.
alter table public.profiles
  add column initial_balance numeric(12, 2) not null default 0;
