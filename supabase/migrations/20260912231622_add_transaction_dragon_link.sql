alter table public.transactions add column dragon_id uuid references public.dragons on delete set null;
