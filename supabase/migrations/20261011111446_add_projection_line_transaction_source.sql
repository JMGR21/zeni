-- Permite importar movimientos reales ya registrados (ingresos/gastos del
-- mes) como líneas de un escenario, además de las fuentes generadas
-- automáticamente (recurrente/presupuesto/deuda) y las manuales.
alter table public.projection_lines drop constraint projection_lines_source_check;
alter table public.projection_lines
  add constraint projection_lines_source_check check (source in ('manual', 'budget', 'recurring', 'debt', 'transaction'));
