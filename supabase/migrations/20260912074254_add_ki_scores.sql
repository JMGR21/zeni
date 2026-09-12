-- Un registro por usuario y mes (upsert). Sirve para trazabilidad y, en la
-- Fase 6, para detectar cuándo el usuario "sube de nivel" comparando contra
-- el mes anterior.
create table public.ki_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  year_month date not null, -- siempre el día 1 del mes correspondiente
  score numeric(5, 2) not null,
  level_label text not null,
  computed_at timestamp with time zone default now(),
  unique (user_id, year_month)
);

alter table public.ki_scores enable row level security;

create policy "Users can manage their own ki scores" on public.ki_scores
  for all using (auth.uid() = user_id);
