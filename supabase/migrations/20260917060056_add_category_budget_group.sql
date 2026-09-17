alter table public.categories
  add column budget_group text check (budget_group in ('necesidad', 'deseo'));
