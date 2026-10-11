create table public.projection_scenarios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  month date not null, -- primer día del mes proyectado
  name text not null,
  opening_balance numeric(12, 2) not null default 0,
  buffer_percent numeric(5, 2) not null default 10 check (buffer_percent >= 0),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.projection_lines (
  id uuid default gen_random_uuid() primary key,
  scenario_id uuid references public.projection_scenarios on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null, -- denormalizado, mismo patrón que dragon_contributions/recurring_transaction_occurrences, para que la policy de RLS no dependa de un join
  kind text check (kind in ('income', 'expense')) not null,
  label text not null,
  amount numeric(12, 2) not null check (amount > 0),
  expected_date date not null,
  category_id uuid references public.categories on delete set null,
  source text check (source in ('manual', 'budget', 'recurring', 'debt')) not null default 'manual',
  source_ref uuid, -- id de la deuda/recurrente/etc. de origen; null para líneas manuales
  included boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index projection_lines_scenario_id_idx on public.projection_lines (scenario_id);

alter table public.projection_scenarios enable row level security;
alter table public.projection_lines enable row level security;

create policy "Users can manage their own projection scenarios" on public.projection_scenarios
  for all using (auth.uid() = user_id);

create policy "Users can manage their own projection lines" on public.projection_lines
  for all using (auth.uid() = user_id);
