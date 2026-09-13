-- La migración inicial solo creó policy de SELECT para profiles — nunca
-- hubo permiso de UPDATE, así que updateProfile/updateAvatar actualizaban
-- 0 filas en silencio (RLS bloquea sin lanzar error).
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);
