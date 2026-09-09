-- Perfil de usuario (extiende auth.users de Supabase)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  currency text default 'MXN',
  created_at timestamp with time zone default now()
);

-- Categorías de ingresos/gastos
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('income', 'expense')) not null,
  created_at timestamp with time zone default now()
);

-- Row Level Security: cada usuario solo ve sus propios datos
alter table public.profiles enable row level security;
alter table public.categories enable row level security;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can manage their own categories" on public.categories
  for all using (auth.uid() = user_id);

-- Trigger: crear perfil automáticamente al registrarse
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();