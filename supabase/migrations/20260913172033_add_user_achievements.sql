-- El catálogo de los logros (metadata: nombre, descripción, ícono, xp, etc.)
-- vive en código (src/lib/achievements.ts), NO en una tabla — mismo patrón
-- que el catálogo de instituciones de la Fase 4. Esta tabla solo registra
-- qué logros ha desbloqueado cada usuario.
create table public.user_achievements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  achievement_slug text not null,
  unlocked_at timestamp with time zone default now(),
  unique (user_id, achievement_slug)
);

alter table public.user_achievements enable row level security;

create policy "Users can view their own achievements" on public.user_achievements
  for select using (auth.uid() = user_id);

create policy "Users can insert their own achievements" on public.user_achievements
  for insert with check (auth.uid() = user_id);
