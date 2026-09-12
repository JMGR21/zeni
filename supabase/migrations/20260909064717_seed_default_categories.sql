-- Amplía el trigger de creación de usuario para sembrar categorías por defecto
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');

  insert into public.categories (user_id, name, type) values
    (new.id, 'Salario', 'income'),
    (new.id, 'Freelance', 'income'),
    (new.id, 'Otros ingresos', 'income'),
    (new.id, 'Comida', 'expense'),
    (new.id, 'Transporte', 'expense'),
    (new.id, 'Vivienda', 'expense'),
    (new.id, 'Entretenimiento', 'expense'),
    (new.id, 'Salud', 'expense'),
    (new.id, 'Otros gastos', 'expense');

  return new;
end;
$$ language plpgsql security definer;
