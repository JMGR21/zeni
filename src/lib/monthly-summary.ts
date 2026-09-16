import type { SupabaseClient } from "@supabase/supabase-js";

export type MonthlyFlow = { month: string; income: number; expense: number };

function monthStart(date: Date, offsetMonths: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1);
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Serie de ingresos/gastos por mes calendario (el más reciente al final),
// para la gráfica de tendencia del dashboard. Los meses sin movimientos
// quedan en 0 en vez de ausentes, para que la gráfica siempre tenga el
// mismo número de barras.
export async function getMonthlyIncomeExpenseSeries(
  supabase: SupabaseClient,
  userId: string,
  months = 6,
): Promise<MonthlyFlow[]> {
  const now = new Date();
  const earliestStart = monthStart(now, -(months - 1));
  const rangeEnd = monthStart(now, 1);

  const { data } = await supabase
    .from("transactions")
    .select("type, amount, occurred_on")
    .eq("user_id", userId)
    .gte("occurred_on", toISODate(earliestStart))
    .lt("occurred_on", toISODate(rangeEnd))
    .returns<{ type: "income" | "expense"; amount: number; occurred_on: string }[]>();

  const byMonth = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < months; i++) {
    byMonth.set(toISODate(monthStart(now, -(months - 1) + i)), { income: 0, expense: 0 });
  }

  for (const row of data ?? []) {
    const bucket = byMonth.get(`${row.occurred_on.slice(0, 7)}-01`);
    if (!bucket) continue;
    if (row.type === "income") bucket.income += row.amount;
    else bucket.expense += row.amount;
  }

  return Array.from(byMonth.entries()).map(([month, totals]) => ({ month, ...totals }));
}
