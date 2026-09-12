-- Cada fila es una concesión de XP. dedupe_key evita otorgar el mismo XP
-- dos veces (ej. "2026-09-12" para el bono diario de esa fecha,
-- "week:2026-09-07" para el bono semanal de esa semana, etc.) — el propio
-- constraint UNIQUE hace de guardia, no hace falta verificar manualmente
-- en cada lugar donde se otorga XP.
create table public.xp_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  amount integer not null,
  dedupe_key text not null,
  created_at timestamp with time zone default now(),
  unique (user_id, dedupe_key)
);

alter table public.xp_events enable row level security;

create policy "Users can manage their own xp events" on public.xp_events
  for all using (auth.uid() = user_id);
