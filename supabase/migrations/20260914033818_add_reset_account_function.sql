-- Borra toda la información financiera del usuario autenticado y la deja en el
-- mismo estado que una cuenta recién creada (categorías por defecto incluidas).
-- No toca `profiles` (nombre, correo, moneda, avatar se conservan).
create or replace function public.reset_account()
returns void
language plpgsql
security invoker -- corre con los permisos del usuario autenticado, respeta RLS
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;

  -- Orden seguro para las foreign keys: hijos antes que padres.
  -- (dragon_contributions.transaction_id y recurring_transaction_occurrences.transaction_id
  -- ya cascadean/anulan al borrar transactions, pero se listan explícitos por claridad.)
  delete from public.dragon_contributions where user_id = uid;
  delete from public.recurring_transaction_occurrences where user_id = uid;
  delete from public.transactions where user_id = uid;
  delete from public.recurring_transactions where user_id = uid;
  delete from public.dragons where user_id = uid;
  delete from public.budgets where user_id = uid;
  delete from public.ki_scores where user_id = uid;
  delete from public.xp_events where user_id = uid;
  delete from public.user_achievements where user_id = uid;
  delete from public.categories where user_id = uid;

  -- Recrear las categorías por defecto, igual que al registrarse
  -- (ver handle_new_user en 20260909064717_seed_default_categories.sql).
  insert into public.categories (user_id, name, type) values
    (uid, 'Salario', 'income'),
    (uid, 'Freelance', 'income'),
    (uid, 'Otros ingresos', 'income'),
    (uid, 'Comida', 'expense'),
    (uid, 'Transporte', 'expense'),
    (uid, 'Vivienda', 'expense'),
    (uid, 'Entretenimiento', 'expense'),
    (uid, 'Salud', 'expense'),
    (uid, 'Otros gastos', 'expense');
end;
$$;
