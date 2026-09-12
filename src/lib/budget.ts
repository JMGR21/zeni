import type { SupabaseClient } from "@supabase/supabase-js";

export type SuggestedBudget = { available: true; amount: number } | { available: false };

export type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  customAmount: number | null;
  suggestion: SuggestedBudget;
};

// El monto que realmente aplica para una categoría: el override manual si
// existe, si no la sugerencia calculada; `null` si no hay ninguno de los
// dos todavía (necesita más historial).
export function resolveBudgetedAmount(category: BudgetCategory): number | null {
  return category.customAmount ?? (category.suggestion.available ? category.suggestion.amount : null);
}

const SUGGESTION_MONTHS = 3;

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(from: Date, monthsAgo: number) {
  return new Date(from.getFullYear(), from.getMonth() - monthsAgo, 1);
}

/**
 * Presupuesto sugerido para una categoría de gasto: el promedio de gasto
 * mensual en los últimos SUGGESTION_MONTHS meses calendario completos (el
 * mes en curso no cuenta, sigue incompleto).
 *
 * Devuelve `available: false` si el usuario no tiene todavía un mes
 * calendario completo de historial (en cualquier categoría) o si esta
 * categoría en particular no tuvo gasto en la ventana de sugerencia —
 * en ambos casos no hay base suficiente para no inventar un número.
 */
export async function getSuggestedBudget(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string,
  now: Date = new Date(),
): Promise<SuggestedBudget> {
  const currentMonthStart = toISODate(monthStart(now, 0));

  const { data: earliest } = await supabase
    .from("transactions")
    .select("occurred_on")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!earliest || earliest.occurred_on >= currentMonthStart) {
    return { available: false };
  }

  const windowStart = toISODate(monthStart(now, SUGGESTION_MONTHS));

  const { data: rows } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .eq("type", "expense")
    .gte("occurred_on", windowStart)
    .lt("occurred_on", currentMonthStart);

  if (!rows || rows.length === 0) {
    return { available: false };
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return { available: true, amount: total / SUGGESTION_MONTHS };
}

/**
 * Si un mes calendario (ya cerrado o no) se mantuvo dentro del presupuesto
 * total — misma lógica que `budget-summary.tsx`: gastado total (de las
 * categorías con un monto presupuestado, sugerido o manual) contra el
 * presupuesto total de esas mismas categorías. Sin ninguna categoría
 * presupuestada no hay base para calificar el mes como cumplido.
 */
export async function wasMonthWithinBudget(
  supabase: SupabaseClient,
  userId: string,
  monthStart: Date,
): Promise<boolean> {
  const start = toISODate(monthStart);
  const end = toISODate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));

  const [{ data: categories }, { data: budgets }, { data: transactions }] = await Promise.all([
    supabase.from("categories").select("id").eq("user_id", userId).eq("type", "expense"),
    supabase.from("budgets").select("category_id, amount").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("occurred_on", start)
      .lt("occurred_on", end),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const row of transactions ?? []) {
    if (!row.category_id) continue;
    spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + row.amount);
  }
  const budgetByCategory = new Map((budgets ?? []).map((row) => [row.category_id, row.amount]));

  const budgetCategories: BudgetCategory[] = await Promise.all(
    (categories ?? []).map(async (category) => ({
      id: category.id,
      name: "",
      spent: spentByCategory.get(category.id) ?? 0,
      customAmount: budgetByCategory.get(category.id) ?? null,
      suggestion: await getSuggestedBudget(supabase, userId, category.id, monthStart),
    })),
  );

  const { totalBudget, totalSpent } = budgetCategories.reduce(
    (acc, category) => {
      const budgeted = resolveBudgetedAmount(category);
      if (budgeted === null) return acc;
      acc.totalBudget += budgeted;
      acc.totalSpent += category.spent;
      return acc;
    },
    { totalBudget: 0, totalSpent: 0 },
  );

  return totalBudget > 0 && totalSpent <= totalBudget;
}
