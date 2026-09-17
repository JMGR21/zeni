import type { SupabaseClient } from "@supabase/supabase-js";

export interface FiftyThirtyTwentyResult {
  necessityAmount: number;
  wantAmount: number;
  savingsAmount: number;
  unclassifiedAmount: number;
  necessityPct: number;
  wantPct: number;
  savingsPct: number;
  unclassifiedPct: number;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Regla 50/30/20 (Necesidad/Deseo/Ahorro) para un mes calendario dado.
 * `income = 0` no tiene base sobre la cual calcular porcentajes, así que
 * devuelve `null` en vez de una división por cero.
 *
 * El ahorro/deuda del 20% viene de `dragon_contributions` (abonos reales a
 * Dragones), no de transacciones de gasto categorizadas — y por eso las
 * transacciones de gasto vinculadas a un Dragón (`dragon_id` no nulo) se
 * excluyen de Necesidad/Deseo, para no contar el mismo monto dos veces.
 */
export async function computeFiftyThirtyTwenty(
  supabase: SupabaseClient,
  userId: string,
  month: Date,
): Promise<FiftyThirtyTwentyResult | null> {
  const start = toISODate(new Date(month.getFullYear(), month.getMonth(), 1));
  const end = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const [{ data: incomeRows }, { data: expenseRows }, { data: categories }, { data: contributionRows }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "income")
        .gte("occurred_on", start)
        .lt("occurred_on", end),
      supabase
        .from("transactions")
        .select("amount, category_id")
        .eq("user_id", userId)
        .eq("type", "expense")
        .is("dragon_id", null)
        .gte("occurred_on", start)
        .lt("occurred_on", end),
      supabase
        .from("categories")
        .select("id, budget_group")
        .eq("user_id", userId)
        .eq("type", "expense")
        .returns<{ id: string; budget_group: "necesidad" | "deseo" | null }[]>(),
      supabase
        .from("dragon_contributions")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", start)
        .lt("created_at", end),
    ]);

  const income = (incomeRows ?? []).reduce((sum, row) => sum + row.amount, 0);
  if (income <= 0) return null;

  const groupByCategory = new Map((categories ?? []).map((category) => [category.id, category.budget_group]));

  let necessityAmount = 0;
  let wantAmount = 0;
  let unclassifiedAmount = 0;
  for (const row of expenseRows ?? []) {
    const group = row.category_id ? groupByCategory.get(row.category_id) : undefined;
    if (group === "necesidad") necessityAmount += row.amount;
    else if (group === "deseo") wantAmount += row.amount;
    else unclassifiedAmount += row.amount;
  }

  const savingsAmount = (contributionRows ?? []).reduce((sum, row) => sum + row.amount, 0);

  return {
    necessityAmount,
    wantAmount,
    savingsAmount,
    unclassifiedAmount,
    necessityPct: (necessityAmount / income) * 100,
    wantPct: (wantAmount / income) * 100,
    savingsPct: (savingsAmount / income) * 100,
    unclassifiedPct: (unclassifiedAmount / income) * 100,
  };
}
