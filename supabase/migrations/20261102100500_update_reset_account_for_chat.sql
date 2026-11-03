-- Amplía reset_account() (20260914033818_add_reset_account_function.sql) para
-- que también borre la conversación del chat asistente al reiniciar la cuenta.
-- No se edita la migración original ya aplicada; se reemplaza la función completa.
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

  delete from public.chat_messages where user_id = uid;
  delete from public.chat_threads where user_id = uid;
  delete from public.chat_usage_daily where user_id = uid;

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
