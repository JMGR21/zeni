-- Permite comparar presupuesto vs. gasto/ingreso real por línea: `amount`
-- sigue siendo el presupuesto; `actual_amount` (null = "todavía no sucede")
-- guarda lo que realmente ocurrió. Null no cuenta como 0 "ya gastado" vs.
-- un valor explícito en 0 — ambos se tratan igual al sumar, pero null deja
-- claro en la UI que la línea sigue sin confirmar.
alter table public.projection_lines
  add column actual_amount numeric(12, 2) check (actual_amount is null or actual_amount >= 0);
