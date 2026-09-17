-- Tercera opción de clasificación 50/30/20: categorías de deuda que el
-- usuario paga pero no lleva como Dragón (sin seguimiento estricto) — deben
-- contar hacia el 20% de Ahorro/Deuda, no hacia Necesidad/Deseo.
alter table public.categories drop constraint categories_budget_group_check;
alter table public.categories
  add constraint categories_budget_group_check check (budget_group in ('necesidad', 'deseo', 'ahorro'));
