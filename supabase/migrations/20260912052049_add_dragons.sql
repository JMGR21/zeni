create table public.dragons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('savings', 'debt')) not null,
  target_amount numeric(12, 2) not null check (target_amount > 0),
  current_amount numeric(12, 2) not null default 0,
  status text check (status in ('active', 'completed')) not null default 'active',
  priority integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.dragons enable row level security;

create policy "Users can manage their own dragons" on public.dragons
  for all using (auth.uid() = user_id);
