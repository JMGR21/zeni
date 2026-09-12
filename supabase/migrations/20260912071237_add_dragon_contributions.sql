create table public.dragon_contributions (
  id uuid default gen_random_uuid() primary key,
  dragon_id uuid references public.dragons on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamp with time zone default now()
);

alter table public.dragon_contributions enable row level security;

create policy "Users can manage their own dragon contributions" on public.dragon_contributions
  for all using (auth.uid() = user_id);
