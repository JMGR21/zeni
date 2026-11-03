-- Chat asistente de Zeni: hilos, mensajes y tope de uso diario. Solo lectura
-- sobre datos financieros (ver src/lib/chat/) — estas tablas solo guardan la
-- conversación en sí.
create table public.chat_threads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null default 'Nueva conversación',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  thread_id uuid references public.chat_threads on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null, -- denormalizado, mismo patrón que dragon_contributions/projection_lines, para que la policy de RLS no dependa de un join
  role text check (role in ('user', 'assistant')) not null,
  content text not null,
  context_snapshot jsonb, -- solo en mensajes 'user': ruta y searchParams de la pantalla al enviar
  tool_calls jsonb, -- solo en mensajes 'assistant': nombres de las herramientas usadas en el turno, sin datos crudos
  created_at timestamp with time zone default now()
);

create index chat_messages_thread_id_created_at_idx on public.chat_messages (thread_id, created_at);

create table public.chat_usage_daily (
  user_id uuid references auth.users on delete cascade not null,
  day date not null,
  message_count integer not null default 0,
  primary key (user_id, day)
);

create index chat_threads_user_id_updated_at_idx on public.chat_threads (user_id, updated_at desc);

alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_usage_daily enable row level security;

create policy "Users can manage their own chat threads" on public.chat_threads
  for all using (auth.uid() = user_id);

create policy "Users can manage their own chat messages" on public.chat_messages
  for all using (auth.uid() = user_id);

create policy "Users can manage their own chat usage" on public.chat_usage_daily
  for all using (auth.uid() = user_id);
