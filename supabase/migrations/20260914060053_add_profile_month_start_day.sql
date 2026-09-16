-- Día del mes (1-28, para que exista en todos los meses incluido febrero)
-- en que el usuario considera que arranca su "mes" financiero. Por defecto
-- 1 (mes calendario clásico) para no cambiar el comportamiento de nadie
-- que no lo configure explícitamente.
alter table public.profiles
  add column month_start_day integer not null default 1
    check (month_start_day between 1 and 28);
