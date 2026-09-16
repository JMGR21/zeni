alter table public.dragon_contributions
  add column transaction_id uuid references public.transactions(id) on delete cascade,
  add constraint dragon_contributions_transaction_id_unique unique (transaction_id);
