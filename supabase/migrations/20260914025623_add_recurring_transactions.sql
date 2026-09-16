create table public.recurring_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric(12, 2) not null check (amount > 0),
  category_id uuid references public.categories on delete set null,
  frequency text check (frequency in ('weekly', 'biweekly', 'monthly')) not null,
  day_of_week integer, -- 0-6, solo aplica si frequency = 'weekly'
  day_of_month integer, -- 1-31, solo aplica si frequency = 'monthly' (si el mes no tiene ese día, usa el último día del mes)
  next_occurrence_date date not null,
  auto_apply boolean not null default false,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

create table public.recurring_transaction_occurrences (
  id uuid default gen_random_uuid() primary key,
  recurring_transaction_id uuid references public.recurring_transactions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  scheduled_date date not null,
  status text check (status in ('pending', 'applied', 'rejected', 'insufficient_funds')) not null,
  transaction_id uuid references public.transactions on delete set null,
  created_at timestamp with time zone default now(),
  resolved_at timestamp with time zone
);

alter table public.transactions add column recurring_transaction_id uuid references public.recurring_transactions on delete set null;

alter table public.recurring_transactions enable row level security;
alter table public.recurring_transaction_occurrences enable row level security;

create policy "Users can manage their own recurring transactions" on public.recurring_transactions
  for all using (auth.uid() = user_id);

create policy "Users can manage their own recurring occurrences" on public.recurring_transaction_occurrences
  for all using (auth.uid() = user_id);
