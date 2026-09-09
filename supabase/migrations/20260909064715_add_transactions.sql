-- Transacciones (ingresos y gastos) registrados por el usuario
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete set null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric(12, 2) not null check (amount > 0),
  description text,
  occurred_on date not null default current_date,
  created_at timestamp with time zone default now()
);

alter table public.transactions enable row level security;

create policy "Users can manage their own transactions" on public.transactions
  for all using (auth.uid() = user_id);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
