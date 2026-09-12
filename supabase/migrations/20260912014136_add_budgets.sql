-- Solo guarda los presupuestos que el usuario personaliza manualmente.
-- El presupuesto sugerido (default) se calcula al vuelo desde transactions,
-- no se persiste, para que nunca quede desincronizado del gasto real.
create table public.budgets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  updated_at timestamp with time zone default now(),
  unique (user_id, category_id)
);

alter table public.budgets enable row level security;

create policy "Users can manage their own budgets" on public.budgets
  for all using (auth.uid() = user_id);
